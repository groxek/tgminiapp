import { html, raw, percent } from '../core/dom.js';
import { href, path } from '../core/router.js';
import { cardStatus, statusCounts } from '../core/store.js';
import { getExam, getSubject, loadDoc } from '../content/catalog.js';
import { enhance, prepare } from '../content/render.js';
import { icon } from '../ui/icons.js';
import { emptyState, statusBar, statusChip, statusLegend } from '../ui/components.js';

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'new', label: 'Не начато' },
  { id: 'learning', label: 'Учу' },
  { id: 'know', label: 'Знаю' },
];
const filterState = new Map();

const norm = (v) => String(v || '').toLowerCase().replace(/ё/g, 'е');

function stats(doc) {
  return statusCounts(doc.questions.map((q) => q.key));
}

function statsBlock(doc) {
  const counts = stats(doc);
  return html`<div class="exam-stats" data-role="stats">
    <div class="exam-stats__row"><strong>${percent(counts.know, counts.total)}%</strong><span>готовность · ${counts.know}/${counts.total}</span></div>
    ${statusBar(counts)}${statusLegend(counts)}
  </div>`;
}

export default {
  tab: 'session',
  async load({ params }) {
    const subject = getSubject(params.subject);
    const exam = getExam(params.subject, params.exam);
    if (!subject || !exam) throw new Error('Список вопросов не найден');
    const doc = await loadDoc(exam);
    return { subject, exam, doc };
  },
  chrome: (ctx, { subject, exam }) => ({ title: exam.title, crumb: subject.short, back: path('s', subject.id, 'exam') }),

  render(ctx, { subject, exam, doc }) {
    const quizPath = path('q', 'e', subject.id, exam.slug);
    const counts = stats(doc);
    const unknown = counts.total - counts.know;
    const current = filterState.get(exam.key) || { status: 'all', text: '' };
    let group = null;
    const rows = [];
    for (const q of doc.questions) {
      if (q.group && q.group !== group) {
        group = q.group;
        rows.push(html`<h3 class="list-group">${group}</h3>`);
      }
      rows.push(html`<div class="q-row glass" data-status="${cardStatus(q.key)}" data-search="${norm(`${q.n} ${q.titleText} ${q.promptText}`)}">
        <a class="q-row__main" href="${href(path('e', subject.id, exam.slug, q.id))}" data-haptic="light">
          <span class="q-row__num">${q.n}</span>
          <span class="q-row__title">${raw(prepare(q.titleHtml, exam))}</span>
        </a>
        ${statusChip(q.key, { size: 'status-chip--compact' })}
      </div>`);
    }
    const randomQ = doc.questions.length ? doc.questions[Math.floor(Math.random() * doc.questions.length)] : null;
    return html`<div class="page page--exam accent-${subject.accent}">
      <section class="exam-hero glass">
        <div class="hero__glow" aria-hidden="true"></div>
        <p class="eyebrow">${subject.title}${exam.kind ? ` · ${exam.kind}` : ''}</p>
        <h1>${doc.title || exam.title}</h1>
        ${doc.lead ? raw(prepare(doc.lead, exam)) : ''}
        ${doc.intro ? html`<div class="prose prose--compact">${raw(prepare(doc.intro, exam))}</div>` : ''}
        ${doc.questions.length ? statsBlock(doc) : ''}
        ${doc.questions.length ? html`<div class="btn-row">
          <a class="btn btn--primary" href="${href(quizPath)}" data-haptic="medium">${icon('shuffle', { size: 18 })}<span>Тренировка</span></a>
          ${unknown && counts.know ? html`<a class="btn btn--glass" href="${href(quizPath, { mode: 'unknown' })}">${icon('repeat', { size: 18 })}<span>Незнакомые · ${unknown}</span></a>` : ''}
          <a class="btn btn--glass" href="${href(quizPath, { mode: 'random', n: 10 })}">${icon('bolt', { size: 18 })}<span>10 случайных</span></a>
          ${randomQ ? html`<a class="btn btn--ghost" href="${href(path('e', subject.id, exam.slug, randomQ.id))}">${icon('sparkles', { size: 18 })}<span>Случайный</span></a>` : ''}
        </div>` : ''}
      </section>

      ${doc.questions.length ? html`<div class="toolbar">
        <label class="search-field">${icon('search', { size: 18 })}<input type="search" data-role="filter-text" placeholder="Найти вопрос" value="${current.text}" autocomplete="off" enterkeyhint="search"></label>
        <div class="filter-chips" role="radiogroup" aria-label="Фильтр по статусу">
          ${FILTERS.map((f) => html`<button type="button" class="filter-chip ${current.status === f.id ? 'is-active' : ''}" data-action="filter" data-filter="${f.id}" role="radio" aria-checked="${current.status === f.id}">${f.label}</button>`)}
        </div>
      </div>
      <div class="question-list" data-role="list">${rows}</div>
      <p class="list-empty" data-role="empty" hidden>Ничего не найдено</p>`
        : emptyState({ glyph: 'cap', title: 'Вопросов нет', text: 'Добавьте заголовки вида «## 1. Текст вопроса» в файл.' })}
    </div>`;
  },

  mount(root, ctx, data) {
    const cleanup = enhance(root);
    const input = root.querySelector('[data-role="filter-text"]');
    const apply = () => {
      const state = filterState.get(data.exam.key) || { status: 'all', text: '' };
      const text = norm(state.text).trim();
      let visible = 0;
      let lastGroup = null;
      let groupHasVisible = false;
      const toggleGroup = () => { if (lastGroup) lastGroup.hidden = !groupHasVisible; };
      for (const el of root.querySelectorAll('[data-role="list"] > *')) {
        if (el.classList.contains('list-group')) {
          toggleGroup();
          lastGroup = el;
          groupHasVisible = false;
          continue;
        }
        const ok = (state.status === 'all' || el.dataset.status === state.status) && (!text || el.dataset.search.includes(text));
        el.hidden = !ok;
        if (ok) { visible += 1; groupHasVisible = true; }
      }
      toggleGroup();
      const empty = root.querySelector('[data-role="empty"]');
      if (empty) empty.hidden = visible > 0;
    };
    const onInput = () => {
      const state = filterState.get(data.exam.key) || { status: 'all', text: '' };
      filterState.set(data.exam.key, { ...state, text: input.value });
      apply();
    };
    input?.addEventListener('input', onInput);
    const onStatus = (event) => {
      const row = root.querySelector(`[data-key="${CSS.escape(event.detail.key)}"]`)?.closest('.q-row');
      if (row) row.dataset.status = event.detail.status;
      const statsEl = root.querySelector('[data-role="stats"]');
      if (statsEl) statsEl.outerHTML = String(statsBlock(data.doc));
    };
    document.addEventListener('status-changed', onStatus);
    apply();
    return () => {
      cleanup();
      input?.removeEventListener('input', onInput);
      document.removeEventListener('status-changed', onStatus);
    };
  },

  actions: {
    filter(el, event, ctx, data) {
      const state = filterState.get(data.exam.key) || { status: 'all', text: '' };
      filterState.set(data.exam.key, { ...state, status: el.dataset.filter });
      for (const chip of el.parentElement.children) {
        const on = chip === el;
        chip.classList.toggle('is-active', on);
        chip.setAttribute('aria-checked', String(on));
      }
      el.closest('.page')?.querySelector('[data-role="filter-text"]')?.dispatchEvent(new Event('input'));
    },
  },
};

