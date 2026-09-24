// DOM helpers and an auto-escaping HTML template tag.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

/** Marks a string as trusted HTML (already escaped or sanitized). */
export const raw = (value) => new SafeHtml(String(value ?? ''));

function serialize(value) {
  if (value == null || value === false || value === true) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(serialize).join('');
  return esc(value);
}

/**
 * Tagged template: interpolated values are escaped unless wrapped with raw()
 * or produced by another html`` call. Arrays are joined, null/false/true skipped.
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) out += serialize(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

export function setHtml(el, content) {
  el.innerHTML = String(content ?? '');
  return el;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function debounce(fn, wait) {
  let timer = null;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.flush = (...args) => { clearTimeout(timer); fn(...args); };
  return debounced;
}

export function onIdle(fn, timeout = 1200) {
  if ('requestIdleCallback' in window) return window.requestIdleCallback(fn, { timeout });
  return setTimeout(fn, 120);
}

export function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const countLabel = (n, one, few, many) => `${n} ${plural(n, one, few, many)}`;

export function percent(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Cryptographically seeded Fisher–Yates shuffle (returns a new array). */
export function shuffle(list) {
  const out = list.slice();
  const random = new Uint32Array(out.length);
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(random);
  else for (let i = 0; i < random.length; i += 1) random[i] = Math.floor(Math.random() * 2 ** 32);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = random[i] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
