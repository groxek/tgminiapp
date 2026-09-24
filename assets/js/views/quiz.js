import { html, raw, clamp, countLabel } from '../core/dom.js';
import { href, path } from '../core/router.js';
import { cardState, cardStatus, clearQuizSession, getQuizSession, putCard, recordAnswer, saveQuizSession } from '../core/store.js';
import { haptic } from '../core/telegram.js';
import { motionReduced } from '../core/theme.js';
import { getExam, getLecture, getSubject, loadDoc } from '../content/catalog.js';
import { enhance, prepare } from '../content/render.js';
import { createSession, currentKey, grade, isFinished, reconcile, reveal, stats } from '../quiz/engine.js';
import { icon } from '../ui/icons.js';
import { bar, emptyState, ring } from '../ui/components.js';

const MODES = ['all', 'unknown', 'random'];

function formatDuration(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function newSession(data, keys) {
  const session = createSession({ scope: data.scope, title: data.title, mode: data.mode, keys, limit: data.limit });
  saveQuizSession(data.scope, session);
  data.history = [];
  return session;
}

function initialKeys(data) {
  const keys = Array.from(data.items.keys());
  if (data.mode !== 'unknown') return keys;
  const unknown = keys.filter((k) => cardStatus(k) !== 'know');
  return unknown.length ? unknown : keys;
}

function cardMarkup(data) {
  const { session } = data;
  const key = currentKey(session);
  const item = data.items.get(key);
  if (!item) return '';
  const { q, entry } = item;
  const attempt = session.attempts[key] || 0;
  const st = stats(session);
  const context = entry.type === 'exam' ? q.group : (data.entries > 1 ? entry.title : '');
  return html`<div class="quiz-head">
      <div class="quiz-head__row">
        <span class="quiz-head__title">${data.title}</span>
        <span class="quiz-head__count">${session.pos + 1} / ${session.queue.length}</span>
      </div>
      ${bar(session.pos / Math.max(1, session.queue.length), { label: 'Прогресс квиза' })}
      <div class="quiz-head__stats">
        <span class="stat stat--ok">${icon('check', { size: 14 })}${st.known}</span>
        <span class="stat stat--ko">${icon('x', { size: 14 })}${st.unknown}</span>
        <span class="stat">осталось ${st.remaining}</span>
      </div>
    </div>
    <div class="flashcard glass ${session.revealed ? 'is-revealed' : ''}" data-key="${key}">
      <div class="flashcard__front">
        <div class="flashcard__meta">
          <span>${[q.n ? `№ ${q.n}` : '', context].filter(Boolean).join(' · ') || 'Вопрос'}</span>
          ${attempt ? html`<span class="retry-badge">${icon('repeat', { size: 13 })}повтор</span>` : ''}
        </div>
        <h2 class="flashcard__q">${raw(prepare(q.titleHtml, entry))}</h2>
        ${q.promptHtml ? html`<div class="prompt prose">${raw(prepare(q.promptHtml, entry))}</div>` : ''}
      </div>
      <div class="flashcard__answer" ${session.revealed ? '' : 'hidden'}>
        <div class="flashcard__divider"><span>Ответ</span></div>
        <div class="prose">${raw(prepare(q.answerHtml || '<p><em>Ответ не записан.</em></p>', entry))}</div>
      </div>
    </div>
    <div class="quiz-actions">
      ${session.revealed
        ? html`<button type="button" class="btn btn--danger btn--lg" data-action="grade" data-grade="unknown">${icon('x', { size: 20 })}<span>Не знаю</span><kbd>1</kbd></button>
               <button type="button" class="btn btn--success btn--lg" data-action="grade" data-grade="know">${icon('check', { size: 20 })}<span>Знаю</span><kbd>2</kbd></button>`
        : html`<button type="button" class="btn btn--primary btn--lg btn--block" data-action="reveal">${icon('eye', { size: 20 })}<span>Показать ответ</span><kbd>Space</kbd></button>`}
    </div>
    <div class="quiz-footer">
      <button type="button" class="btn btn--ghost btn--sm" data-action="undo" ${data.history.length ? '' : 'disabled'}>${icon('undo', { size: 16 })}<span>Отменить</span></button>
      <button type="button" class="btn btn--ghost btn--sm" data-action="restart">${icon('repeat', { size: 16 })}<span>Сначала</span></button>
    </div>`;
}

function summaryMarkup(data) {
  const st = stats(data.session);
  const share = st.total ? st.known / st.total : 0;
  const great = share >= 0.8;
  const unknownItems = st.unknownKeys.map((k) => data.items.get(k)).filter(Boolean);
  const linkFor = ({ q, entry }) => (entry.type === 'exam'
    ? href(path('e', entry.subjectId, entry.slug, q.id))
    : href(entry.route, { s: `h-${q.anchor}` }));
  return html`<section class="quiz-summary glass ${great ? 'is-great' : ''}">
    <div class="quiz-summary__ring">${ring(share, { size: 132, stroke: 11, label: `${Math.round(share * 100)}%`, sub: 'знаю' })}</div>
    <h2>${great ? 'Отличный результат!' : share >= 0.5 ? 'Хороший прогресс' : 'Есть над чем поработать'}</h2>
    <p class="quiz-summary__text">${st.known} из ${countLabel(st.total, 'вопроса', 'вопросов', 'вопросов')} · с первого раза ${st.firstTry} · вспомнили после повтора ${st.relearned} · ${formatDuration(st.duration)}</p>
    <div class="btn-row btn-row--center">
      ${unknownItems.length ? html`<button type="button" class="btn btn--primary" data-action="retry-unknown">${icon('repeat', { size: 18 })}<span>Повторить незнакомые · ${unknownItems.length}</span></button>` : ''}
      <button type="button" class="btn ${unknownItems.length ? 'btn--glass' : 'btn--primary'}" data-action="restart">${icon('shuffle', { size: 18 })}<span>Пройти заново</span></button>
      <a class="btn btn--ghost" href="${href(data.backRoute)}">${icon('back', { size: 18 })}<span>Вернуться</span></a>
    </div>
    ${unknownItems.length ? html`<div class="quiz-summary__list">
      <h3>Стоит повторить</h3>
      ${unknownItems.map((item) => html`<a class="q-row q-row--link glass" href="${linkFor(item)}"><span class="q-row__num">${item.q.n || '•'}</span><span class="q-row__title">${raw(prepare(item.q.titleHtml, item.entry))}</span></a>`)}
    </div>` : ''}
  </section>`;
}

function stageMarkup(data) {
  if (!data.items.size) return emptyState({ glyph: 'cards', title: 'Вопросов нет', text: 'В этом разделе пока нет вопросов для тренировки.', action: html`<a class="btn btn--glass" href="${href(data.backRoute)}">Вернуться</a>` });
  return isFinished(data.session) ? summaryMarkup(data) : cardMarkup(data);
}

function update(data, { leaving = '' } = {}) {
  const stage = document.querySelector('[data-role="quiz-stage"]');
  if (!stage) return;
  const swap = () => {
    data.cleanup?.();
    stage.innerHTML = String(stageMarkup(data));
    data.cleanup = enhance(stage);
    stage.querySelector('.flashcard, .quiz-summary')?.classList.add('is-entering');
  };
  const card = stage.querySelector('.flashcard');
  if (leaving && card && !motionReduced()) {
    card.classList.add(`is-leaving-${leaving}`);
    setTimeout(swap, 170);
  } else {
    swap();
  }
}

function doReveal(data) {
  if (isFinished(data.session) || data.session.revealed) return;
  data.session = reveal(data.session);
  saveQuizSession(data.scope, data.session);
  haptic.impact('soft');
  const card = document.querySelector('.flashcard');
  const answer = card?.querySelector('.flashcard__answer');
  if (card && answer) {
    answer.hidden = false;
    card.classList.add('is-revealed');
    const actions = document.querySelector('.quiz-actions');
    if (actions) {
      actions.innerHTML = `<button type="button" class="btn btn--danger btn--lg" data-action="grade" data-grade="unknown">${icon('x', { size: 20 })}<span>Не знаю</span><kbd>1</kbd></button><button type="button" class="btn btn--success btn--lg" data-action="grade" data-grade="know">${icon('check', { size: 20 })}<span>Знаю</span><kbd>2</kbd></button>`;
    }
    const rect = answer.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.75) window.scrollBy({ top: rect.top - window.innerHeight * 0.35, behavior: motionReduced() ? 'auto' : 'smooth' });
  } else {
    update(data);
  }
}

function doGrade(data, value) {
  if (isFinished(data.session)) return;
  if (!data.session.revealed) { doReveal(data); return; }
  const key = currentKey(data.session);
  data.history.push({ session: data.session, key, card: cardState(key) });
  if (data.history.length > 50) data.history.shift();
  recordAnswer(key, value);
  data.session = grade(data.session, value);
  saveQuizSession(data.scope, data.session);
  if (isFinished(data.session)) haptic.notify('success');
  else if (value === 'know') haptic.impact('light');
  else haptic.notify('warning');
  update(data, { leaving: value === 'know' ? 'right' : 'left' });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function doUndo(data) {
  const last = data.history.pop();
  if (!last) return;
  data.session = last.session;
  putCard(last.key, last.card);
  saveQuizSession(data.scope, data.session);
  haptic.select();
  update(data);
}

export default {
  tab: 'session',
  async load({ params, query }) {
    const subject = getSubject(params.subject);
    if (!subject) throw new Error('Предмет не найден');
    let entries = [];
    let title = '';
    let backRoute = path('s', subject.id);
    if (params.kind === 'e') {
      const exam = getExam(subject.id, params.target);
      if (!exam) throw new Error('Список вопросов не найден');
      entries = [exam];
      title = exam.title;
      backRoute = exam.route;
    } else if (params.kind === 'l') {
      const lecture = getLecture(subject.id, params.target);
      if (!lecture) throw new Error('Лекция не найдена');
      entries = [lecture];
      title = lecture.title;
      backRoute = lecture.route;
    } else if (params.kind === 's' && !params.target) {
      entries = subject.lectures;
      title = `Все лекции · ${subject.short}`;
    } else {
      throw new Error('Неизвестный квиз');
    }
    const results = await Promise.allSettled(entries.map((e) => loadDoc(e)));
    const items = new Map();
    results.forEach((result, i) => {
      if (result.status !== 'fulfilled') return;
      for (const q of result.value.questions) items.set(q.key, { q, entry: entries[i] });
    });
    const mode = MODES.includes(query.mode) ? query.mode : 'all';
    const limit = mode === 'random' ? clamp(Number(query.n) || 10, 1, 100) : 0;
    const scope = `${params.kind}:${subject.id}/${params.target || '*'}:${mode}${limit ? `:${limit}` : ''}`;
    const data = { subject, title, items, scope, mode, limit, backRoute, entries: entries.length, history: [], cleanup: null };
    let session = getQuizSession(scope);
    if (session && (session.v !== 1 || isFinished(session))) session = null;
    if (session) session = reconcile(session, Array.from(items.keys()));
    data.session = session && !isFinished(session) ? session : newSession(data, initialKeys(data));
    return data;
  },
  chrome: (ctx, data) => ({
    title: data.mode === 'unknown' ? 'Незнакомые' : data.mode === 'random' ? `${data.limit} случайных` : 'Квиз',
    crumb: data.subject.short,
    back: data.backRoute,
  }),

  render(ctx, data) {
    return html`<div class="page page--quiz accent-${data.subject.accent}">
      <div class="quiz-stage" data-role="quiz-stage">${stageMarkup(data)}</div>
    </div>`;
  },

  mount(root, ctx, data) {
    data.cleanup = enhance(root);
    return () => data.cleanup?.();
  },

  actions: {
    reveal: (el, event, ctx, data) => doReveal(data),
    grade: (el, event, ctx, data) => doGrade(data, el.dataset.grade === 'know' ? 'know' : 'unknown'),
    undo: (el, event, ctx, data) => doUndo(data),
    restart(el, event, ctx, data) {
      clearQuizSession(data.scope);
      data.session = newSession(data, initialKeys(data));
      haptic.impact('medium');
      update(data);
    },
    'retry-unknown'(el, event, ctx, data) {
      const keys = stats(data.session).unknownKeys;
      data.session = newSession(data, keys);
      haptic.impact('medium');
      update(data);
    },
  },

  keys: {
    ' ': (ctx, data) => doReveal(data),
    Enter: (ctx, data) => doReveal(data),
    1: (ctx, data) => data.session.revealed && doGrade(data, 'unknown'),
    2: (ctx, data) => data.session.revealed && doGrade(data, 'know'),
    ArrowLeft: (ctx, data) => data.session.revealed && doGrade(data, 'unknown'),
    ArrowRight: (ctx, data) => data.session.revealed && doGrade(data, 'know'),
    z: (ctx, data) => doUndo(data),
    Backspace: (ctx, data) => doUndo(data),
  },
};

