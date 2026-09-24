// Allowlist sanitizer for HTML produced from Markdown (authors may embed raw HTML).

const ALLOWED = {
  a: ['href', 'title'], abbr: ['title'], aside: [], b: [], blockquote: [], br: [], caption: [],
  code: [], col: ['span'], colgroup: ['span'], dd: [], del: [], details: ['open'], div: ['data-mermaid'],
  dl: [], dt: [], em: [], figcaption: [], figure: [], h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'],
  h5: ['id'], h6: ['id'], hr: [], i: [], img: ['src', 'alt', 'title', 'width', 'height'],
  input: ['type', 'checked', 'disabled'], ins: [], kbd: [], li: [], mark: [], ol: ['start', 'type'],
  p: [], pre: ['data-lang'], q: [], s: [], small: [], span: ['data-display'], strong: [], sub: [],
  summary: [], sup: [], table: [], tbody: [], td: ['align', 'colspan', 'rowspan'], tfoot: [],
  th: ['align', 'colspan', 'rowspan', 'scope'], thead: [], tr: [], u: [], ul: [],
};
const GLOBAL = ['class', 'lang', 'dir'];
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'svg', 'math',
  'link', 'meta', 'base', 'form', 'input-hidden', 'textarea', 'select', 'option', 'button', 'frame', 'frameset', 'audio', 'video', 'source', 'canvas']);
const SAFE_URL = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i;
const SAFE_IMG = /^(?:https?:|data:image\/(?:png|jpe?g|gif|webp|avif);base64,|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i;
const CLASS_TOKEN = /^[a-z][a-z0-9_-]{0,48}$/i;

function cleanAttributes(el, tag) {
  const allowed = ALLOWED[tag];
  for (const { name, value } of Array.from(el.attributes)) {
    const lower = name.toLowerCase();
    if (!allowed.includes(lower) && !GLOBAL.includes(lower)) { el.removeAttribute(name); continue; }
    const trimmed = value.trim();
    if (lower === 'class') {
      const keep = trimmed.split(/\s+/).filter((c) => CLASS_TOKEN.test(c));
      if (keep.length) el.setAttribute('class', keep.join(' ')); else el.removeAttribute('class');
    } else if (lower === 'href' && (!SAFE_URL.test(trimmed) || /^\s*(javascript|vbscript|data):/i.test(trimmed))) {
      el.removeAttribute(name);
    } else if (lower === 'src' && !SAFE_IMG.test(trimmed)) {
      el.removeAttribute(name);
    } else if (lower === 'id') {
      const id = trimmed.replace(/[^\w-]/g, '');
      if (id) el.setAttribute('id', id.startsWith('h-') ? id : `h-${id}`); else el.removeAttribute('id');
    } else if ((lower === 'colspan' || lower === 'rowspan' || lower === 'span')) {
      const n = Math.min(50, Math.max(1, parseInt(trimmed, 10) || 1));
      el.setAttribute(name, String(n));
    }
  }
  if (tag === 'input') {
    if ((el.getAttribute('type') || '').toLowerCase() !== 'checkbox') { el.remove(); return; }
    el.setAttribute('disabled', '');
  }
  if (tag === 'img') {
    el.setAttribute('loading', 'lazy');
    el.setAttribute('decoding', 'async');
  }
}

function clean(node) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) { child.remove(); continue; }
    const tag = child.tagName.toLowerCase();
    if (DROP.has(tag)) { child.remove(); continue; }
    if (!ALLOWED[tag]) {
      clean(child);
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }
    cleanAttributes(child, tag);
    if (child.isConnected || child.parentNode) clean(child);
  }
}

/** Returns a sanitized DocumentFragment. */
export function sanitizeToFragment(htmlString) {
  const template = document.createElement('template');
  template.innerHTML = String(htmlString ?? '');
  clean(template.content);
  return template.content;
}

/** Returns sanitized HTML as a string. */
export function sanitize(htmlString) {
  const template = document.createElement('template');
  template.innerHTML = String(htmlString ?? '');
  clean(template.content);
  return template.innerHTML;
}
