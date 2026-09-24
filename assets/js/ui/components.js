// Reusable markup builders.

import { html, raw, uid, percent, countLabel } from '../core/dom.js';
import { href } from '../core/router.js';
import { STATUS_LABEL, cardStatus, isLectureDone, statusCounts } from '../core/store.js';
import { icon } from './icons.js';

export function ring(value, { size = 84, stroke = 8, label = '', sub = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  const id = uid('ring');
  return html`<div class="ring" style="--size:${size}px">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>
      <circle class="ring__track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
      ${v > 0 ? html`<circle class="ring__value" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke="url(#${id})"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - v)).toFixed(2)}" style="--ring-c:${c.toFixed(2)}"/>` : ''}
    </svg>
    <div class="ring__label"><b>${label}</b>${sub ? html`<small>${sub}</small>` : ''}</div>
  </div>`;
}

export function bar(value, { label = '' } = {}) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  return html`<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v * 100)}" aria-label="${label || 'Прогресс'}"><span style="--value:${v}"></span></div>`;
}

export function statusBar(counts) {
  const total = counts.total || 1;
  return html`<div class="status-bar" aria-hidden="true">
    <span class="status-bar__know" style="--part:${counts.know / total}"></span>
    <span class="status-bar__learning" style="--part:${counts.learning / total}"></span>
  </div>`;
}

export function statusLegend(counts) {
  return html`<div class="legend">
    <span class="legend__item legend__item--know">${counts.know} знаю</span>
    <span class="legend__item legend__item--learning">${counts.learning} учу</span>
    <span class="legend__item legend__item--new">${counts.new} не начато</span>
  </div>`;
}

export function statusChip(key, { size = '' } = {}) {
  const status = cardStatus(key);
  return html`<button type="button" class="status-chip status-chip--${status} ${size}" data-action="cycle-status" data-key="${key}" aria-label="Статус: ${STATUS_LABEL[status]}. Нажмите, чтобы изменить">
    <i aria-hidden="true"></i><span>${STATUS_LABEL[status]}</span>
  </button>`;
}

export function subjectGlyph(subject, { size = '' } = {}) {
  return html`<span class="glyph glyph--${subject.accent} ${size}" aria-hidden="true">${subject.icon}</span>`;
}

export function subjectProgress(subject) {
  const lectures = subject.lectures.length;
  const read = subject.lectures.filter((l) => isLectureDone(l.key)).length;
  const keys = examKeys(subject);
  const counts = statusCounts(keys);
  return { lectures, read, counts, keys };
}

export function examKeys(subject) {
  return subject.exams.flatMap((exam) => (exam.questionIds || []).map((id) => `${exam.key}#${id}`));
}

export const entryKeys = (entry) => (entry.questionIds || []).map((id) => `${entry.key}#${id}`);

export function subjectCard(subject) {
  const { lectures, read, counts } = subjectProgress(subject);
  const questions = counts.total;
  const lectureShare = lectures ? read / lectures : 0;
  return html`<a class="subject-card accent-${subject.accent}" href="${href(`/s/${encodeURIComponent(subject.id)}`)}" data-haptic="light">
    <div class="subject-card__top">
      ${subjectGlyph(subject)}
      <span class="subject-card__arrow">${icon('arrow', { size: 18 })}</span>
    </div>
    <h3 class="subject-card__title">${subject.title}</h3>
    <p class="subject-card__meta">${lectures ? countLabel(lectures, 'лекция', 'лекции', 'лекций') : 'Нет лекций'}${questions ? ` · ${countLabel(questions, 'вопрос', 'вопроса', 'вопросов')}` : ''}</p>
    <div class="subject-card__progress">
      ${bar(lectures ? lectureShare : (questions ? counts.know / questions : 0), { label: `Прогресс: ${subject.title}` })}
      <span>${lectures ? `${read}/${lectures}` : `${percent(counts.know, questions)}%`}</span>
    </div>
  </a>`;
}

export function emptyState({ glyph = 'sparkles', title, text = '', action = '' }) {
  return html`<div class="empty">
    <div class="empty__icon">${icon(glyph, { size: 28 })}</div>
    <h3>${title}</h3>
    ${text ? html`<p>${text}</p>` : ''}
    ${action}
  </div>`;
}

export function skeleton(kind = 'list') {
  if (kind === 'reader') {
    return html`<div class="skeleton-page" aria-busy="true" aria-label="Загрузка">
      <div class="sk sk--eyebrow"></div><div class="sk sk--title"></div><div class="sk sk--title sk--short"></div>
      ${Array.from({ length: 7 }, (_, i) => html`<div class="sk sk--line ${i % 3 === 2 ? 'sk--short' : ''}"></div>`)}
    </div>`;
  }
  return html`<div class="skeleton-page" aria-busy="true" aria-label="Загрузка">
    <div class="sk sk--hero"></div>
    <div class="sk-grid">${Array.from({ length: 4 }, () => html`<div class="sk sk--card"></div>`)}</div>
  </div>`;
}

export function errorState(error, { retry = true } = {}) {
  const details = error?.details?.length ? error.details : [error?.message].filter(Boolean);
  return html`<div class="empty empty--error">
    <div class="empty__icon">${icon('info', { size: 28 })}</div>
    <h3>${error?.message || 'Что-то пошло не так'}</h3>
    ${details.length ? html`<ul class="empty__details">${details.map((d) => html`<li>${d}</li>`)}</ul>` : ''}
    ${retry ? html`<button type="button" class="btn btn--primary" data-action="retry">${icon('repeat', { size: 18 })}<span>Повторить</span></button>` : ''}
  </div>`;
}

export function sectionHead(title, { meta = '', link = '' } = {}) {
  return html`<header class="section__head"><h2>${title}</h2>${meta ? html`<span class="section__meta">${meta}</span>` : ''}${link ? raw(String(link)) : ''}</header>`;
}

export function kindBadge(kind) {
  return html`<span class="file-badge file-badge--${String(kind).toLowerCase()}">${kind}</span>`;
}
