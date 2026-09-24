import { html } from '../core/dom.js';
import { emptyState, sectionHead, subjectGlyph } from '../ui/components.js';
import { materialRow } from './subject.js';

export default {
  tab: 'materials',
  chrome: () => ({ title: 'Файлы', crumb: 'Исходные материалы', back: false }),

  render({ catalog }) {
    const subjects = catalog.subjects.filter((s) => s.materials.length);
    if (!subjects.length) return emptyState({ glyph: 'folder', title: 'Файлов пока нет', text: 'Положите PDF, DOC или DOCX в content/<предмет>/materials/ — они появятся здесь.' });
    return html`<div class="page page--materials">
      <p class="page-intro">Оригинальные файлы преподавателей: списки вопросов, билеты и задачи. Открываются во встроенном просмотрщике Telegram или в браузере.</p>
      ${subjects.map((subject) => html`<section class="section accent-${subject.accent}">
        ${sectionHead(html`${subjectGlyph(subject, { size: 'glyph--xs' })} ${subject.title}`, { meta: String(subject.materials.length) })}
        <div class="stack">${subject.materials.map((m) => materialRow(m))}</div>
      </section>`)}
    </div>`;
  },
};
