import { html, countLabel, percent } from '../core/dom.js';
import { href, path } from '../core/router.js';
import { isLectureDone, lectureState, statusCounts } from '../core/store.js';
import { getSubject } from '../content/catalog.js';
import { icon } from '../ui/icons.js';
import { emptyState, entryKeys, kindBadge, ring, statusBar, statusLegend, subjectGlyph, subjectProgress } from '../ui/components.js';

const TABS = [
  { id: 'lectures', label: 'Лекции', count: (s) => s.lectures.length },
  { id: 'exam', label: 'Экзамен', count: (s) => s.exams.length },
  { id: 'files', label: 'Файлы', count: (s) => s.materials.length },
];

function lectureRow(lecture, index) {
  const st = lectureState(lecture.key);
  const done = Boolean(st?.done);
  const pos = done ? 1 : st?.pos || 0;
  return html`<a class="lecture-row glass ${done ? 'is-done' : ''}" href="${href(lecture.route)}" data-haptic="light">
    <span class="lecture-row__num" aria-hidden="true">${done ? icon('check', { size: 18 }) : String(lecture.order ?? index + 1).padStart(2, '0')}</span>
    <span class="lecture-row__body">
      <strong>${lecture.title}</strong>
      ${lecture.summary ? html`<span class="lecture-row__summary">${lecture.summary}</span>` : ''}
      <span class="meta-line">
        ${lecture.minutes ? html`<span>${icon('clock', { size: 14 })}${lecture.minutes} мин</span>` : ''}
        ${lecture.questionCount ? html`<span>${icon('cards', { size: 14 })}${countLabel(lecture.questionCount, 'вопрос', 'вопроса', 'вопросов')}</span>` : ''}
        ${!done && pos > 0.02 ? html`<span class="meta-line__accent">${Math.round(pos * 100)}%</span>` : ''}
      </span>
    </span>
    <span class="lecture-row__go">${icon('chevron', { size: 18 })}</span>
  </a>`;
}

function lecturesPanel(subject) {
  if (!subject.lectures.length) return emptyState({ glyph: 'book', title: 'Лекций пока нет', text: `Добавьте файл content/${subject.folder}/01-тема.md` });
  let group = null;
  const rows = [];
  subject.lectures.forEach((lecture, i) => {
    if (lecture.group && lecture.group !== group) {
      group = lecture.group;
      rows.push(html`<h3 class="list-group">${group}</h3>`);
    }
    rows.push(lectureRow(lecture, i));
  });
  return html`<div class="stack">${rows}</div>`;
}

function examPanel(subject) {
  if (!subject.exams.length) return emptyState({ glyph: 'cap', title: 'Вопросов к экзамену нет', text: `Файл content/${subject.folder}/exam.md появится здесь автоматически.` });
  return html`<div class="stack">${subject.exams.map((exam) => {
    const keys = entryKeys(exam);
    const counts = statusCounts(keys);
    const unknown = counts.total - counts.know;
    return html`<article class="exam-panel glass">
      <a class="exam-panel__head" href="${href(exam.route)}" data-haptic="light">
        <span class="exam-panel__icon">${icon('cap', { size: 22 })}</span>
        <span><strong>${exam.title}</strong><small>${exam.questionCount == null ? 'Загрузка…' : countLabel(exam.questionCount, 'вопрос', 'вопроса', 'вопросов')}${counts.total ? ` · готовность ${percent(counts.know, counts.total)}%` : ''}</small></span>
        ${icon('chevron', { size: 18 })}
      </a>
      ${counts.total ? html`${statusBar(counts)}${statusLegend(counts)}` : ''}
      <div class="btn-row">
        <a class="btn btn--primary btn--sm" href="${href(path('q', 'e', subject.id, exam.slug))}" data-haptic="medium">${icon('shuffle', { size: 16 })}<span>Тренировка</span></a>
        ${unknown && counts.know ? html`<a class="btn btn--glass btn--sm" href="${href(path('q', 'e', subject.id, exam.slug), { mode: 'unknown' })}">${icon('repeat', { size: 16 })}<span>Незнакомые · ${unknown}</span></a>` : ''}
        <a class="btn btn--ghost btn--sm" href="${href(exam.route)}">${icon('list', { size: 16 })}<span>Список</span></a>
      </div>
    </article>`;
  })}</div>`;
}

export function materialRow(material, { withSubject = false, subject = null } = {}) {
  return html`<a class="file-row glass" href="${material.url}" data-file data-haptic="light">
    ${kindBadge(material.kind)}
    <span class="file-row__body">
      <strong>${material.title}</strong>
      <small>${withSubject && subject ? `${subject.short} · ` : ''}${material.description || material.name}</small>
    </span>
    <span class="file-row__go">${icon('external', { size: 18 })}</span>
  </a>`;
}

function filesPanel(subject) {
  if (!subject.materials.length) return emptyState({ glyph: 'folder', title: 'Файлов нет', text: `Положите PDF/DOC в content/${subject.folder}/materials/` });
  return html`<div class="stack">${subject.materials.map((m) => materialRow(m))}</div>`;
}

export default {
  tab: 'home',
  load({ params }) {
    const subject = getSubject(params.subject);
    if (!subject) throw new Error('Предмет не найден');
    return { subject };
  },
  chrome: (ctx, { subject }) => ({ title: subject.title, crumb: 'Предмет', back: '/' }),

  render({ params }, { subject }) {
    const available = TABS.filter((t) => t.count(subject) > 0);
    const tab = available.find((t) => t.id === params.tab) || available[0] || TABS[0];
    const { lectures, read, counts } = subjectProgress(subject);
    const quizCount = subject.lectures.reduce((n, l) => n + (l.questionCount || 0), 0);
    const share = lectures ? read / lectures : 0;
    return html`<div class="page page--subject accent-${subject.accent}">
      <section class="subject-hero glass">
        <div class="hero__glow" aria-hidden="true"></div>
        ${subjectGlyph(subject, { size: 'glyph--xl' })}
        <div class="subject-hero__text">
          <h1>${subject.title}</h1>
          ${subject.description ? html`<p>${subject.description}</p>` : ''}
          <div class="chips">
            ${lectures ? html`<span class="chip">${icon('book', { size: 14 })}${read}/${lectures} прочитано</span>` : ''}
            ${counts.total ? html`<span class="chip">${icon('cap', { size: 14 })}${percent(counts.know, counts.total)}% к экзамену</span>` : ''}
          </div>
          ${quizCount ? html`<a class="btn btn--primary btn--sm" href="${href(path('q', 's', subject.id))}" data-haptic="medium">${icon('cards', { size: 16 })}<span>Квиз по предмету · ${quizCount}</span></a>` : ''}
        </div>
        ${lectures ? html`<div class="subject-hero__ring">${ring(share, { size: 76, stroke: 7, label: `${Math.round(share * 100)}%` })}</div>` : ''}
      </section>

      ${available.length > 1 ? html`<nav class="segmented" aria-label="Разделы предмета">
        ${available.map((t) => html`<a class="segmented__item ${t.id === tab.id ? 'is-active' : ''}" href="${href(path('s', subject.id, t.id))}" ${t.id === tab.id ? 'aria-current="page"' : ''} data-haptic="select">${t.label}<span>${t.count(subject)}</span></a>`)}
      </nav>` : ''}

      <div class="tab-panel">
        ${tab.id === 'lectures' ? lecturesPanel(subject) : tab.id === 'exam' ? examPanel(subject) : filesPanel(subject)}
      </div>
    </div>`;
  },

  onChange(type) {
    return ['entry', 'prefetched', 'card', 'reading', 'import', 'reset'].includes(type);
  },
};

