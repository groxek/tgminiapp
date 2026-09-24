import { html, raw, debounce } from '../core/dom.js';
import { href } from '../core/router.js';
import { buildIndex, highlight, search, snippet } from '../content/search.js';
import { icon } from '../ui/icons.js';
import { kindBadge } from '../ui/components.js';

const KIND_LABEL = { lecture: 'Лекция', section: 'Раздел', quiz: 'Самопроверка', question: 'Вопрос', material: 'Файл' };
const SUGGESTIONS = ['предел', 'определитель', 'Пётр I', 'полином Жегалкина', 'university', 'производная'];

let lastQuery = '';

function resultMarkup(entry, query) {
  const accent = entry.subject?.accent || 'violet';
  const inner = html`<span class="result__kind">${KIND_LABEL[entry.kind]}${entry.context ? ` · ${entry.context}` : ''}</span>
    <strong class="result__title">${raw(highlight(entry.title, query))}</strong>
    ${entry.text ? html`<span class="result__snippet">${raw(snippet(entry.text, query))}</span>` : ''}`;
  if (entry.kind === 'material') {
    return html`<a class="result glass accent-${accent}" href="${entry.material.url}" data-file>${kindBadge(entry.material.kind)}<span class="result__body">${inner}</span></a>`;
  }
  return html`<a class="result glass accent-${accent}" href="${entry.route}" data-haptic="light"><span class="result__dot"></span><span class="result__body">${inner}</span></a>`;
}

export default {
  tab: 'search',
  chrome: () => ({ title: 'Поиск', crumb: 'По всем материалам', back: false }),

  render({ query }) {
    const q = query.q ?? lastQuery;
    return html`<div class="page page--search">
      <label class="search-field search-field--hero glass">
        ${icon('search', { size: 22 })}
        <input type="search" data-role="search" value="${q}" placeholder="Лекции, вопросы, формулы…" autocomplete="off" enterkeyhint="search" aria-label="Поиск по материалам">
        <kbd>/</kbd>
      </label>
      <p class="search-status" data-role="status"></p>
      <div class="stack" data-role="results"></div>
      <div class="suggestions" data-role="suggestions">
        <p>Попробуйте:</p>
        <div class="chips">${SUGGESTIONS.map((s) => html`<button type="button" class="chip chip--button" data-action="suggest" data-q="${s}">${s}</button>`)}</div>
      </div>
    </div>`;
  },

  mount(root, ctx) {
    const input = root.querySelector('[data-role="search"]');
    const status = root.querySelector('[data-role="status"]');
    const results = root.querySelector('[data-role="results"]');
    const suggestions = root.querySelector('[data-role="suggestions"]');
    let index = null;
    let alive = true;

    const run = () => {
      const q = input.value.trim();
      lastQuery = q;
      history.replaceState(history.state, '', href('/search', q ? { q } : undefined));
      suggestions.hidden = Boolean(q);
      if (!q) { results.innerHTML = ''; status.textContent = index ? '' : status.textContent; return; }
      if (!index) return;
      const found = search(index, q);
      status.textContent = found.length ? `Найдено: ${found.length}${found.length >= 80 ? '+' : ''}` : 'Ничего не найдено — попробуйте другое слово';
      results.innerHTML = found.map((entry) => String(resultMarkup(entry, q))).join('');
    };
    const debounced = debounce(run, 90);
    input.addEventListener('input', debounced);

    status.textContent = 'Индексирую материалы…';
    buildIndex({
      onProgress: (done, total) => { if (alive && !index) status.textContent = `Индексирую материалы… ${done}/${total}`; },
    }).then((built) => {
      if (!alive) return;
      index = built;
      status.textContent = '';
      run();
    });

    if (!matchMedia('(pointer: coarse)').matches || !ctx.query.q) {
      requestAnimationFrame(() => input.focus({ preventScroll: true }));
    }
    return () => { alive = false; input.removeEventListener('input', debounced); };
  },

  actions: {
    suggest(el) {
      const input = document.querySelector('[data-role="search"]');
      if (!input) return;
      input.value = el.dataset.q;
      input.dispatchEvent(new Event('input'));
    },
  },
};
