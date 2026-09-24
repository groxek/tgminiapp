// Hash router: "#/l/history/introduction?s=h-section". Tracks navigation direction
// (forward/back) through an index kept in history.state, for page transitions.

import { session } from './storage.js';

const ROUTES = [
  ['home', []],
  ['subject', ['s', ':subject']],
  ['subject', ['s', ':subject', ':tab']],
  ['lecture', ['l', ':subject', ':lecture']],
  ['exam', ['e', ':subject', ':exam']],
  ['question', ['e', ':subject', ':exam', ':q']],
  ['quiz', ['q', ':kind', ':subject']],
  ['quiz', ['q', ':kind', ':subject', ':target']],
  ['session', ['session']],
  ['materials', ['materials']],
  ['search', ['search']],
  ['settings', ['settings']],
];

export const DEPTH = { home: 0, session: 1, materials: 1, search: 1, settings: 1, subject: 1, exam: 2, lecture: 2, question: 3, quiz: 3, notfound: 1 };

function decode(part) {
  try { return decodeURIComponent(part); } catch { return part; }
}

export function parse(hash = location.hash) {
  const value = String(hash || '').replace(/^#/, '');
  const [pathPart, queryPart = ''] = value.split('?');
  const parts = pathPart.split('/').filter(Boolean).map(decode);
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  for (const [name, pattern] of ROUTES) {
    if (pattern.length !== parts.length) continue;
    const params = {};
    const ok = pattern.every((segment, i) => {
      if (segment.startsWith(':')) { params[segment.slice(1)] = parts[i]; return true; }
      return segment === parts[i];
    });
    if (ok) return { name, params, query, path: `/${parts.map(encodeURIComponent).join('/')}`, parts };
  }
  return { name: 'notfound', params: {}, query, path: `/${parts.join('/')}`, parts };
}

export function href(path, query) {
  const clean = String(path || '/').replace(/^#?\/?/, '/');
  const search = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '')).toString() : '';
  return `#${clean}${search ? `?${search}` : ''}`;
}

/** Builds a route path from segments, encoding each one ("/" inside a slug becomes %2F). */
export const path = (...segments) => `/${segments.map((s) => encodeURIComponent(String(s))).join('/')}`;

let index = Number(session.get('konsp-nav-index', 0)) || 0;
let direction = 'none';

export function go(target, { replace = false } = {}) {
  const next = target.startsWith('#') ? target : `#${target}`;
  if (next === location.hash) return;
  if (replace) {
    history.replaceState({ idx: index }, '', next);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = next;
  }
}

/** Call on every hashchange before rendering; returns 'forward' | 'back' | 'none'. */
export function trackDirection() {
  const idx = history.state?.idx;
  if (typeof idx !== 'number') {
    index += 1;
    history.replaceState({ idx: index }, '');
    direction = 'forward';
  } else {
    direction = idx < index ? 'back' : idx > index ? 'forward' : 'none';
    index = idx;
  }
  session.set('konsp-nav-index', index);
  return direction;
}

export const canGoBack = () => index > 0 && typeof history.state?.idx === 'number' && history.state.idx > 0;

export function initIndex() {
  if (typeof history.state?.idx !== 'number') history.replaceState({ idx: index }, '');
  else index = history.state.idx;
}
