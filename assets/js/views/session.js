import { html, countLabel, percent } from '../core/dom.js';
import { href, path } from '../core/router.js';
import { statusCounts } from '../core/store.js';
import { icon } from '../ui/icons.js';
import { emptyState, entryKeys, ring, statusBar, statusLegend, subjectGlyph } from '../ui/components.js';

export default {
  tab: 'session',
  chrome: () => ({ title: 'Сессия', crumb: 'Подготовка', back: false }),

  render({ catalog }) {
    const exams = catalog.subjects.flatMap((subject) => subject.exams.map((exam) => ({ subject, exam })));
    if (!exams.length) return emptyState({ glyph: 'cap', title: 'Нет вопросов к экзаменам', text: 'Добавьте файл exam.md в папку предмета.' });
    const allKeys = exams.flatMap(({ exam }) => entryKeys(exam));
    const total = statusCounts(allKeys);
    const share = total.total ? total.know / total.total : 0;
    return html`<div class="page page--session">
      <section class="hero glass">
        <div class="hero__glow" aria-hidden="true"></div>
        <div class="hero__text">
          <p class="eyebrow">Готовность к сессии</p>
          <h1 class="hero__title">${total.total ? html`<span class="text-gradient">${total.know}</span> из ${countLabel(total.total, 'вопроса', 'вопросов', 'вопросов')}` : 'Вопросы загружаются…'}</h1>
          ${total.total ? html`${statusBar(total)}${statusLegend(total)}` : ''}
          <p class="hero__sub">Отмечайте вопросы «Знаю / Учу», тренируйтесь карточками — незнакомые вернутся, пока не запомнятся.</p>
        </div>
        <div class="hero__ring">${ring(share, { size: 104, stroke: 9, label: `${Math.round(share * 100)}%`, sub: 'знаю' })}</div>
      </section>

      <div class="stack">${exams.map(({ subject, exam }) => {
        const counts = statusCounts(entryKeys(exam));
        const unknown = counts.total - counts.know;
        const quiz = path('q', 'e', subject.id, exam.slug);
        return html`<article class="exam-panel glass accent-${subject.accent}">
          <a class="exam-panel__head" href="${href(exam.route)}" data-haptic="light">
            ${subjectGlyph(subject)}
            <span><strong>${subject.title}</strong><small>${exam.title}${exam.questionCount != null ? ` · ${countLabel(exam.questionCount, 'вопрос', 'вопроса', 'вопросов')}` : ''}</small></span>
            <b class="exam-panel__pct">${counts.total ? `${percent(counts.know, counts.total)}%` : '…'}</b>
          </a>
          ${counts.total ? statusBar(counts) : ''}
          <div class="btn-row">
            <a class="btn btn--primary btn--sm" href="${href(quiz)}" data-haptic="medium">${icon('shuffle', { size: 16 })}<span>Тренировка</span></a>
            ${unknown && counts.know ? html`<a class="btn btn--glass btn--sm" href="${href(quiz, { mode: 'unknown' })}">${icon('repeat', { size: 16 })}<span>Незнакомые · ${unknown}</span></a>` : ''}
            <a class="btn btn--ghost btn--sm" href="${href(exam.route)}">${icon('list', { size: 16 })}<span>Все вопросы</span></a>
          </div>
        </article>`;
      })}</div>
    </div>`;
  },

  onChange(type) {
    return ['entry', 'prefetched', 'card', 'import', 'reset'].includes(type);
  },
};
