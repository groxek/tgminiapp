import { html } from '../core/dom.js';
import { href } from '../core/router.js';
import { emptyState } from '../ui/components.js';

export default {
  tab: null,
  needsCatalog: false,
  chrome: () => ({ title: 'Не найдено', crumb: 'Конспекты', back: '/' }),
  render: () => emptyState({
    glyph: 'flag',
    title: 'Такой страницы нет',
    text: 'Возможно, материал переименовали или удалили.',
    action: html`<a class="btn btn--primary" href="${href('/')}">На главную</a>`,
  }),
};
