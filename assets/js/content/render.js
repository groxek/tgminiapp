// Turns parsed document HTML into safe, app-aware markup and enhances it once mounted.

import { href } from '../core/router.js';
import { sanitizeToFragment } from './sanitize.js';
import { resolveLink } from './catalog.js';
import { slugify } from './slug.js';
import { typesetWithin } from './math.js';
import { renderDiagramsWithin } from './diagrams.js';

const anchorId = (fragment) => {
  let value = String(fragment || '');
  try { value = decodeURIComponent(value); } catch { /* keep */ }
  return value.startsWith('h-') ? value : `h-${slugify(value, 48)}`;
};

/**
 * Sanitizes document HTML and rewrites links/images relative to the document file.
 * @param {string} htmlString
 * @param {{ path: string, route: string }} source the catalog entry the HTML belongs to
 */
export function prepare(htmlString, source) {
  const fragment = sanitizeToFragment(htmlString);
  for (const link of fragment.querySelectorAll('a[href]')) {
    const target = resolveLink(source?.path, link.getAttribute('href'));
    if (!target) continue;
    if (target.type === 'external') {
      link.setAttribute('data-external', '');
      link.setAttribute('rel', 'noopener noreferrer');
    } else if (target.type === 'anchor') {
      link.setAttribute('href', href(source.route, { s: anchorId(target.id) }));
    } else if (target.type === 'route') {
      link.setAttribute('href', href(target.route, target.fragment ? { s: anchorId(target.fragment) } : undefined));
    } else {
      link.setAttribute('href', target.url);
      link.setAttribute('data-file', '');
    }
  }
  for (const img of fragment.querySelectorAll('img[src]')) {
    const target = resolveLink(source?.path, img.getAttribute('src'));
    if (target?.type === 'file') img.setAttribute('src', target.url);
    else if (target?.type === 'external') img.setAttribute('referrerpolicy', 'no-referrer');
  }
  for (const pre of fragment.querySelectorAll('pre.code-block')) {
    if (pre.closest('.mermaid-block')) continue;
    pre.insertAdjacentHTML('afterbegin', '<button type="button" class="code-copy" data-action="copy-code" aria-label="Скопировать код">Копировать</button>');
  }
  const holder = document.createElement('div');
  holder.append(fragment);
  return holder.innerHTML;
}

/** Math + diagrams for freshly mounted content. Returns a cleanup function. */
export function enhance(root) {
  const stopMath = typesetWithin(root);
  renderDiagramsWithin(root);
  return () => stopMath();
}

export function scrollToAnchor(id, { smooth = true } = {}) {
  if (!id) return false;
  const target = document.getElementById(id);
  if (!target) return false;
  const top = target.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--anchor-offset')) || 84);
  window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
  if (target.tagName === 'DETAILS') target.open = true;
  target.classList.remove('is-target');
  void target.offsetWidth;
  target.classList.add('is-target');
  return true;
}
