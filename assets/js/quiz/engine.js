// Quiz session engine. Pure functions over a plain, serializable session object, so a
// session survives reloads (it is stored as-is) and every step is easy to undo.
//
// Flow: show card → reveal → grade "know" | "unknown". An unknown card comes back a few
// cards later (at most MAX_ATTEMPTS times per session), so the session ends only when
// everything was either recalled or retried enough.

import { shuffle } from '../core/dom.js';

export const MAX_ATTEMPTS = 3;
const REQUEUE_GAP = 3;

/**
 * @param {object} options
 * @param {string} options.scope   unique scope id, e.g. "e:history/exam"
 * @param {string[]} options.keys  card keys to practise
 * @param {'ordered'|'shuffled'} [options.order]
 * @param {number} [options.limit] take only the first N (after shuffling)
 */
export function createSession({ scope, title = '', mode = 'all', keys, order = 'shuffled', limit = 0 }) {
  let queue = order === 'ordered' ? keys.slice() : shuffle(keys);
  if (limit > 0) queue = queue.slice(0, limit);
  return {
    v: 1,
    scope,
    title,
    mode,
    queue,
    total: queue.length,
    pos: 0,
    revealed: false,
    first: {},
    last: {},
    attempts: {},
    startedAt: Date.now(),
    finishedAt: queue.length ? null : Date.now(),
  };
}

export const currentKey = (s) => (s && s.pos < s.queue.length ? s.queue[s.pos] : null);
export const isFinished = (s) => !s || s.pos >= s.queue.length;

export function reveal(s) {
  return s.revealed ? s : { ...s, revealed: true };
}

export function grade(s, value) {
  const key = currentKey(s);
  if (!key) return s;
  const attempts = { ...s.attempts, [key]: (s.attempts[key] || 0) + 1 };
  const first = key in s.first ? s.first : { ...s.first, [key]: value };
  const last = { ...s.last, [key]: value };
  const queue = s.queue.slice();
  if (value === 'unknown' && attempts[key] < MAX_ATTEMPTS) {
    const at = Math.min(queue.length, s.pos + 1 + REQUEUE_GAP);
    queue.splice(at, 0, key);
  }
  const pos = s.pos + 1;
  return { ...s, queue, pos, revealed: false, attempts, first, last, finishedAt: pos >= queue.length ? Date.now() : null };
}

/** Drops cards that no longer exist (content changed since the session started). */
export function reconcile(s, validKeys) {
  const valid = new Set(validKeys);
  const done = s.queue.slice(0, s.pos);
  const rest = s.queue.slice(s.pos).filter((k) => valid.has(k));
  return { ...s, queue: [...done, ...rest], finishedAt: rest.length ? null : (s.finishedAt || Date.now()) };
}

export function stats(s) {
  const unique = Array.from(new Set(s.queue));
  const answered = Object.keys(s.last).length;
  const known = unique.filter((k) => s.last[k] === 'know').length;
  const unknown = unique.filter((k) => s.last[k] === 'unknown').length;
  const firstTry = unique.filter((k) => s.first[k] === 'know').length;
  const relearned = unique.filter((k) => s.first[k] === 'unknown' && s.last[k] === 'know').length;
  const remaining = Math.max(0, s.queue.length - s.pos);
  return {
    total: unique.length,
    answered,
    known,
    unknown,
    firstTry,
    relearned,
    remaining,
    progress: s.queue.length ? s.pos / s.queue.length : 1,
    duration: (s.finishedAt || Date.now()) - s.startedAt,
    unknownKeys: unique.filter((k) => s.last[k] === 'unknown'),
  };
}
