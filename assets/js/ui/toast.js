import { esc } from '../core/dom.js';

let timer = null;

export function toast(message, { action = null, duration = 2600 } = {}) {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(timer);
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button" class="toast__action">${esc(action.label)}</button>` : ''}`;
  if (action) {
    el.querySelector('.toast__action').addEventListener('click', () => {
      el.classList.remove('is-visible');
      action.run();
    }, { once: true });
  }
  el.classList.add('is-visible');
  timer = setTimeout(() => el.classList.remove('is-visible'), action ? duration + 2400 : duration);
}
