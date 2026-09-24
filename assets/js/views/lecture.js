import { html, raw, countLabel, clamp } from '../core/dom.js';
import { href, path } from '../core/router.js';
import { isLectureDone, lectureState, prefs, saveReadingPosition, setLectureDone, setPref, touchLecture } from '../core/store.js';
import { haptic } from '../core/telegram.js';
import { applyAppearance } from '../core/theme.js';
import { getLecture, getSubject, loadDoc } from '../content/catalog.js';
import { enhance, prepare, scrollToAnchor } from '../content/render.js';
import { icon } from '../ui/icons.js';
import { subjectGlyph } from '../ui/components.js';
import { isFocus, onFocusChange, setFocus, toggleFocus } from '../ui/focus.js';
import { toast } from '../ui/toast.js';

function tocList(doc, lecture) {
  return html`<ol class="toc__list">${doc.toc.map((item) => html`<li class="toc__item toc__item--d${item.depth}">
    <a href="${href(lecture.route, { s: item.id })}" data-anchor="${item.id}">${item.text}</a>
  </li>`)}${doc.quiz ? html`<li class="toc__item toc__item--d2 toc__item--quiz"><a href="${href(lecture.route, { s: `h-${doc.quiz.anchor}` })}" data-anchor="h-${doc.quiz.anchor}">${doc.quiz.title}</a></li>` : ''}</ol>`;
}

function neighbor(subject, lecture, delta) {
  const i = subject.lectures.indexOf(lecture);
  return subject.lectures[i + delta] || null;
}

function doneButton(done) {
  return html`<button type="button" class="btn ${done ? 'btn--success' : 'btn--primary'} btn--lg btn--block" data-action="toggle-done" data-haptic="none">
    ${icon('check', { size: 20 })}<span>${done ? 'Прочитано' : 'Отметить прочитанным'}</span>
  </button>`;
}

export default {
  tab: 'home',
  skeleton: 'reader',
  async load({ params }) {
    const subject = getSubject(params.subject);
    const lecture = getLecture(params.subject, params.lecture);
    if (!subject || !lecture) throw new Error('Лекция не найдена');
    const doc = await loadDoc(lecture);
    return { subject, lecture, doc };
  },
  chrome: (ctx, { subject, lecture }) => ({
    title: lecture.title,
    crumb: subject.short,
    back: path('s', subject.id),
    actions: html`<button type="button" class="icon-btn" data-action="focus" aria-label="Режим фокуса" title="Режим фокуса (F)">${icon('expand', { size: 20 })}</button>`,
  }),

  render(ctx, { subject, lecture, doc }) {
    const done = isLectureDone(lecture.key);
    const st = lectureState(lecture.key);
    const prev = neighbor(subject, lecture, -1);
    const next = neighbor(subject, lecture, 1);
    const resume = !ctx.query.s && !ctx.query.resume && st?.pos > 0.04 && st.pos < 0.97;
    const questions = doc.questions;
    return html`<article class="page page--lecture reader accent-${subject.accent}" data-key="${lecture.key}">
      <header class="reader__hero">
        <a class="eyebrow-link" href="${href(path('s', subject.id))}">${subjectGlyph(subject, { size: 'glyph--xs' })}<span>${subject.title}</span></a>
        <h1 class="reader__title">${doc.title || lecture.title}</h1>
        ${doc.lead ? raw(prepare(doc.lead, lecture)) : ''}
        <div class="meta-line">
          <span>${icon('clock', { size: 15 })}${doc.minutes} мин</span>
          <span>${icon('text', { size: 15 })}${countLabel(doc.words, 'слово', 'слова', 'слов')}</span>
          ${questions.length ? html`<span>${icon('cards', { size: 15 })}${countLabel(questions.length, 'вопрос', 'вопроса', 'вопросов')}</span>` : ''}
          ${done ? html`<span class="meta-line__accent">${icon('check', { size: 15 })}прочитано</span>` : ''}
        </div>
        <div class="reader__tools">
          <button type="button" class="btn btn--glass btn--sm" data-action="focus">${icon('expand', { size: 16 })}<span>Фокус</span></button>
          <div class="font-stepper" role="group" aria-label="Размер текста">
            <button type="button" data-action="font" data-delta="-1" aria-label="Мельче">A−</button>
            <span data-role="font-size">${prefs().fontSize}</span>
            <button type="button" data-action="font" data-delta="1" aria-label="Крупнее">A+</button>
          </div>
          ${questions.length ? html`<a class="btn btn--glass btn--sm" href="${href(path('q', 'l', subject.id, lecture.slug))}">${icon('cards', { size: 16 })}<span>Квиз</span></a>` : ''}
        </div>
        ${resume ? html`<button type="button" class="resume-pill" data-action="resume">${icon('play', { size: 14 })}<span>Продолжить с ${Math.round(st.pos * 100)}%</span></button>` : ''}
        ${doc.toc.length > 1 ? html`<details class="toc toc--inline glass">
          <summary>${icon('list', { size: 18 })}<span>Содержание</span><small>${doc.toc.length}</small></summary>
          ${tocList(doc, lecture)}
        </details>` : ''}
      </header>

      <div class="reader__layout">
        <div class="prose" data-role="prose">${raw(prepare(doc.html, lecture))}</div>
        ${doc.toc.length > 1 ? html`<aside class="toc toc--rail" aria-label="Содержание"><div class="toc__title">Содержание</div>${tocList(doc, lecture)}</aside>` : ''}
      </div>

      ${questions.length ? html`<section class="self-check glass" id="h-${doc.quiz?.anchor || 'self-check'}">
        <header class="self-check__head">
          <span class="self-check__icon">${icon('cards', { size: 22 })}</span>
          <div><h2>${doc.quiz?.title || 'Вопросы для самопроверки'}</h2><p>${countLabel(questions.length, 'вопрос', 'вопроса', 'вопросов')} · нажмите, чтобы увидеть ответ</p></div>
        </header>
        <div class="qa-list">${questions.map((q) => html`<details class="qa" id="h-${q.anchor}">
          <summary><span class="qa__q">${raw(prepare(q.titleHtml, lecture))}</span>${icon('down', { size: 18, className: 'qa__chev' })}</summary>
          <div class="qa__a prose">${raw(prepare(q.answerHtml || '<p>Ответ не записан.</p>', lecture))}</div>
        </details>`)}</div>
        <a class="btn btn--primary btn--block" href="${href(path('q', 'l', subject.id, lecture.slug))}" data-haptic="medium">${icon('bolt', { size: 18 })}<span>Пройти квиз по лекции</span></a>
      </section>` : ''}

      <footer class="reader__end">
        <div data-role="done">${doneButton(done)}</div>
        <nav class="pager" aria-label="Соседние лекции">
          ${prev ? html`<a class="pager__item glass" href="${href(prev.route)}" data-haptic="light"><small>${icon('back', { size: 14 })}Назад</small><strong>${prev.title}</strong></a>` : html`<span></span>`}
          ${next ? html`<a class="pager__item pager__item--next glass" href="${href(next.route)}" data-haptic="light"><small>Далее${icon('chevron', { size: 14 })}</small><strong>${next.title}</strong></a>` : ''}
        </nav>
      </footer>
      <button type="button" class="focus-exit" data-action="focus" aria-label="Выйти из режима фокуса">${icon('collapse', { size: 18 })}<span>Выйти</span></button>
    </article>`;
  },

  mount(root, ctx, { lecture }) {
    const cleanups = [];
    cleanups.push(enhance(root));
    touchLecture(lecture.key);

    const progressEl = document.getElementById('readingProgress');
    const article = root.querySelector('.reader');
    let frame = 0;
    let lastSave = 0;
    let userScrolled = false;
    const measure = () => {
      frame = 0;
      const rect = article.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight * 0.85);
      const pos = clamp(-rect.top / total, 0, 1);
      progressEl?.style.setProperty('--progress', String(pos));
      article.classList.toggle('is-end', pos > 0.96);
      const now = Date.now();
      if (userScrolled && now - lastSave > 800) {
        lastSave = now;
        saveReadingPosition(lecture.key, pos);
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const markUser = () => { userScrolled = true; };
    window.addEventListener('scroll', onScroll, { passive: true });
    for (const type of ['wheel', 'touchmove', 'keydown']) window.addEventListener(type, markUser, { passive: true });
    cleanups.push(() => {
      window.removeEventListener('scroll', onScroll);
      for (const type of ['wheel', 'touchmove', 'keydown']) window.removeEventListener(type, markUser);
      cancelAnimationFrame(frame);
      progressEl?.style.setProperty('--progress', '0');
      if (userScrolled) measure();
    });

    // Table of contents: highlight the section in view.
    const links = Array.from(root.querySelectorAll('.toc a[data-anchor]'));
    const headings = links.map((a) => document.getElementById(a.dataset.anchor)).filter(Boolean);
    if (headings.length && 'IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          for (const a of links) a.classList.toggle('is-active', a.dataset.anchor === entry.target.id);
        }
      }, { rootMargin: '-15% 0px -70% 0px' });
      headings.forEach((h) => spy.observe(h));
      cleanups.push(() => spy.disconnect());
    }

    // In-page anchors: scroll without re-rendering the route.
    const onClick = (event) => {
      const a = event.target.closest('a[href]');
      if (!a) return;
      const url = a.getAttribute('href');
      const [routePart, query = ''] = url.replace(/^#/, '').split('?');
      if (routePart !== lecture.route) return;
      const id = new URLSearchParams(query).get('s');
      if (!id) return;
      event.preventDefault();
      a.closest('details.toc--inline')?.removeAttribute('open');
      scrollToAnchor(id);
      history.replaceState(history.state, '', url);
    };
    root.addEventListener('click', onClick);
    cleanups.push(() => root.removeEventListener('click', onClick));

    // Initial position: anchor, resume, or top. Re-applied while formulas settle.
    const target = ctx.query.s;
    const saved = lectureState(lecture.key)?.pos || 0;
    const apply = () => {
      if (userScrolled) return;
      if (target) scrollToAnchor(target, { smooth: false });
      else if (ctx.query.resume && saved > 0.02) {
        const rect = article.getBoundingClientRect();
        window.scrollTo({ top: (rect.height - window.innerHeight * 0.85) * saved + window.scrollY + rect.top, behavior: 'auto' });
      }
    };
    if (target || ctx.query.resume) {
      requestAnimationFrame(apply);
      const timers = [450, 1300].map((ms) => setTimeout(apply, ms));
      cleanups.push(() => timers.forEach(clearTimeout));
    }
    measure();

    const focusIcon = () => {
      const btn = document.querySelector('#topActions [data-action="focus"]');
      if (btn) btn.innerHTML = String(icon(isFocus() ? 'collapse' : 'expand', { size: 20 }));
    };
    cleanups.push(onFocusChange(focusIcon));
    return () => {
      setFocus(false, { silent: true });
      cleanups.forEach((fn) => fn());
    };
  },

  actions: {
    focus() { toggleFocus(); },
    font(el) {
      const size = clamp(prefs().fontSize + Number(el.dataset.delta || 0), 14, 24);
      setPref('fontSize', size);
      applyAppearance();
      haptic.select();
      document.querySelectorAll('[data-role="font-size"]').forEach((n) => { n.textContent = String(size); });
    },
    resume(el, event, ctx, { lecture }) {
      const saved = lectureState(lecture.key)?.pos || 0;
      const article = document.querySelector('.reader');
      const rect = article.getBoundingClientRect();
      window.scrollTo({ top: (rect.height - window.innerHeight * 0.85) * saved + window.scrollY + rect.top, behavior: 'smooth' });
      el.remove();
    },
    'toggle-done'(el, event, ctx, { lecture }) {
      const done = !isLectureDone(lecture.key);
      setLectureDone(lecture.key, done);
      haptic.notify(done ? 'success' : 'warning');
      const holder = document.querySelector('[data-role="done"]');
      if (holder) holder.innerHTML = String(doneButton(done));
      if (done) toast('Лекция отмечена прочитанной', { action: { label: 'Отменить', run: () => { setLectureDone(lecture.key, false); if (holder) holder.innerHTML = String(doneButton(false)); } } });
    },
  },

  keys: {
    f: () => toggleFocus(),
  },
};
