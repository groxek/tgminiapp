import { html, countLabel, percent } from '../core/dom.js';
import { href } from '../core/router.js';
import { getState, isLectureDone, lectureState, statusCounts } from '../core/store.js';
import { telegramUser } from '../core/telegram.js';
import { icon } from '../ui/icons.js';
import { bar, entryKeys, ring, sectionHead, statusBar, subjectCard, subjectGlyph, emptyState } from '../ui/components.js';

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Доброе утро';
  if (h >= 12 && h < 18) return 'Добрый день';
  if (h >= 18 && h < 23) return 'Добрый вечер';
  return 'Доброй ночи';
}

function findLecture(catalog, key) {
  for (const subject of catalog.subjects) {
    const lecture = subject.lectures.find((l) => l.key === key);
    if (lecture) return { subject, lecture };
  }
  return null;
}

function nextUnread(catalog) {
  for (const subject of catalog.subjects) {
    const lecture = subject.lectures.find((l) => !isLectureDone(l.key));
    if (lecture) return { subject, lecture };
  }
  return null;
}

function continueCard(catalog) {
  const last = getState().last;
  const found = (last && findLecture(catalog, last)) || nextUnread(catalog);
  if (!found) return '';
  const { subject, lecture } = found;
  const st = lectureState(lecture.key);
  const pos = st?.done ? 1 : st?.pos || 0;
  const resume = pos > 0.02 && pos < 0.98;
  return html`<a class="continue-card glass accent-${subject.accent}" href="${href(lecture.route, resume ? { resume: 1 } : undefined)}" data-haptic="light">
    ${subjectGlyph(subject, { size: 'glyph--lg' })}
    <div class="continue-card__body">
      <span class="eyebrow">${resume ? 'Продолжить чтение' : st?.done ? 'Перечитать' : 'Начать лекцию'} · ${subject.short}</span>
      <strong>${lecture.title}</strong>
      <div class="continue-card__progress">${bar(pos)}<span>${Math.round(pos * 100)}%</span></div>
    </div>
    <span class="continue-card__play">${icon('play', { size: 20 })}</span>
  </a>`;
}

function examCard(subject, exam) {
  const keys = entryKeys(exam);
  const counts = statusCounts(keys);
  const ready = percent(counts.know, counts.total);
  return html`<a class="exam-card glass accent-${subject.accent}" href="${href(exam.route)}" data-haptic="light">
    <div class="exam-card__head">${subjectGlyph(subject, { size: 'glyph--sm' })}<span>${subject.short}</span></div>
    <strong class="exam-card__title">${exam.title}</strong>
    ${counts.total ? html`${statusBar(counts)}<span class="exam-card__meta">${ready}% · ${counts.know}/${counts.total}</span>`
      : html`<span class="exam-card__meta">${exam.questionCount == null ? 'Загрузка…' : 'Нет вопросов'}</span>`}
  </a>`;
}

export default {
  tab: 'home',
  chrome: () => ({ title: 'Конспекты', crumb: new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }), back: false }),

  render({ catalog }) {
    const subjects = catalog.subjects;
    if (!subjects.length) {
      return emptyState({ glyph: 'book', title: 'Пока пусто', text: 'Добавьте Markdown-файлы в папку content/<предмет>/ — они появятся здесь автоматически.' });
    }
    const lectures = subjects.flatMap((s) => s.lectures);
    const read = lectures.filter((l) => isLectureDone(l.key)).length;
    const exams = subjects.flatMap((s) => s.exams.map((exam) => ({ subject: s, exam })));
    const examKeys = exams.flatMap(({ exam }) => entryKeys(exam));
    const counts = statusCounts(examKeys);
    const readiness = counts.total ? counts.know / counts.total : 0;
    const user = telegramUser();
    const name = user?.first_name ? `, ${user.first_name}` : '';

    return html`<div class="page page--home">
      <section class="hero glass">
        <div class="hero__glow" aria-hidden="true"></div>
        <div class="hero__text">
          <p class="eyebrow">${greeting()}${name}</p>
          <h1 class="hero__title">${counts.total ? html`Готовность к сессии — <span class="text-gradient">${Math.round(readiness * 100)}%</span>` : 'Учись в своём ритме'}</h1>
          <p class="hero__sub">${read}/${lectures.length} ${lectures.length === 1 ? 'лекция' : 'лекций'} прочитано${counts.total ? ` · ${counts.know} из ${countLabel(counts.total, 'вопроса', 'вопросов', 'вопросов')} знаю` : ''}</p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="${href('/session')}" data-haptic="medium">${icon('bolt', { size: 18 })}<span>Тренировка</span></a>
            <a class="btn btn--glass" href="${href('/search')}">${icon('search', { size: 18 })}<span>Поиск</span></a>
          </div>
        </div>
        <div class="hero__ring">${ring(readiness, { size: 104, stroke: 9, label: `${Math.round(readiness * 100)}%`, sub: 'знаю' })}</div>
      </section>

      ${lectures.length ? html`<section class="section">${sectionHead('Продолжить')}${continueCard(catalog)}</section>` : ''}

      <section class="section">
        ${sectionHead('Предметы', { meta: String(subjects.length) })}
        <div class="subject-grid">${subjects.map(subjectCard)}</div>
      </section>

      ${exams.length ? html`<section class="section">
        ${sectionHead('Сессия', { link: html`<a class="section__link" href="${href('/session')}">Все ${icon('chevron', { size: 16 })}</a>` })}
        <div class="exam-strip">${exams.map(({ subject, exam }) => examCard(subject, exam))}</div>
      </section>` : ''}
    </div>`;
  },

  onChange(type) {
    return type === 'entry' || type === 'prefetched' || type === 'card' || type === 'reading' || type === 'import' || type === 'reset';
  },
};
