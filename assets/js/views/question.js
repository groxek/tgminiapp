import { html, raw } from '../core/dom.js';
import { href, path } from '../core/router.js';
import { STATUSES, STATUS_LABEL, cardStatus, setCardStatus } from '../core/store.js';
import { haptic } from '../core/telegram.js';
import { getExam, getSubject, loadDoc } from '../content/catalog.js';
import { enhance, prepare } from '../content/render.js';
import { icon } from '../ui/icons.js';

function statusSwitch(key) {
  const current = cardStatus(key);
  return html`<div class="status-switch" role="radiogroup" aria-label="Насколько хорошо знаете ответ" data-role="status-switch">
    ${STATUSES.map((s) => html`<button type="button" class="status-switch__item status-switch__item--${s} ${current === s ? 'is-active' : ''}" data-action="set-status" data-status="${s}" role="radio" aria-checked="${current === s}">${STATUS_LABEL[s]}</button>`)}
  </div>`;
}

export default {
  tab: 'session',
  skeleton: 'reader',
  async load({ params }) {
    const subject = getSubject(params.subject);
    const exam = getExam(params.subject, params.exam);
    if (!subject || !exam) throw new Error('Вопрос не найден');
    const doc = await loadDoc(exam);
    const index = doc.questions.findIndex((q) => q.id === params.q);
    if (index < 0) throw new Error('Вопрос не найден');
    return { subject, exam, doc, index, question: doc.questions[index] };
  },
  chrome: (ctx, { subject, exam, question }) => ({ title: `Вопрос ${question.n}`, crumb: `${subject.short} · ${exam.title}`, back: path('e', subject.id, exam.slug) }),

  render(ctx, { subject, exam, doc, index, question }) {
    const prev = doc.questions[index - 1];
    const next = doc.questions[index + 1];
    const link = (q) => href(path('e', subject.id, exam.slug, q.id));
    return html`<article class="page page--question accent-${subject.accent}">
      <header class="question-hero glass">
        <div class="question-hero__top">
          <span class="q-badge">№ ${question.n}</span>
          ${question.group ? html`<span class="question-hero__group">${question.group}</span>` : ''}
          <span class="question-hero__count">${index + 1} / ${doc.questions.length}</span>
        </div>
        <h1 class="question-title">${raw(prepare(question.titleHtml, exam))}</h1>
        ${question.promptHtml ? html`<div class="prompt prose">${raw(prepare(question.promptHtml, exam))}</div>` : ''}
      </header>

      <section class="answer glass">
        <header class="answer__head">${icon('sparkles', { size: 18 })}<span>Ответ</span></header>
        ${question.answerText
          ? html`<div class="prose">${raw(prepare(question.answerHtml, exam))}</div>`
          : html`<p class="answer__empty">Ответ пока не записан — его можно добавить в файл <code>${exam.path}</code> под заголовком вопроса.</p>`}
      </section>

      <section class="question-grade glass">
        <p>Как вы знаете этот вопрос?</p>
        ${statusSwitch(question.key)}
      </section>

      <nav class="pager" aria-label="Соседние вопросы">
        ${prev ? html`<a class="pager__item glass" href="${link(prev)}" data-haptic="select"><small>${icon('back', { size: 14 })}№ ${prev.n}</small><strong>${raw(prepare(prev.titleHtml, exam))}</strong></a>` : html`<span></span>`}
        ${next ? html`<a class="pager__item pager__item--next glass" href="${link(next)}" data-haptic="select"><small>№ ${next.n}${icon('chevron', { size: 14 })}</small><strong>${raw(prepare(next.titleHtml, exam))}</strong></a>` : ''}
      </nav>
    </article>`;
  },

  mount(root) {
    return enhance(root);
  },

  actions: {
    'set-status'(el, event, ctx, { question }) {
      const status = el.dataset.status;
      setCardStatus(question.key, status);
      if (status === 'know') haptic.notify('success');
      else haptic.select();
      const holder = el.closest('[data-role="status-switch"]');
      if (holder) holder.outerHTML = String(statusSwitch(question.key));
    },
  },

  keys: {
    ArrowLeft: (ctx, { subject, exam, doc, index }) => { const q = doc.questions[index - 1]; if (q) location.hash = href(path('e', subject.id, exam.slug, q.id)); },
    ArrowRight: (ctx, { subject, exam, doc, index }) => { const q = doc.questions[index + 1]; if (q) location.hash = href(path('e', subject.id, exam.slug, q.id)); },
  },
};
