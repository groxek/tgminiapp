// Application state: preferences + learning progress, persisted in localStorage.

import { local } from './storage.js';
import { clamp, debounce } from './dom.js';
import * as legacy from './legacy.js';

const KEY = 'konsp-v3';
const VERSION = 3;

export const STATUSES = ['new', 'learning', 'know'];
export const STATUS_LABEL = { new: 'Не начинал', learning: 'Учу', know: 'Знаю' };

export const DEFAULT_PREFS = {
  palette: 'auto',
  scheme: 'auto',
  font: 'system',
  fontSize: 17,
  lineHeight: 1.7,
  width: 'normal',
  motion: 'auto',
  haptics: true,
  focusFullscreen: false,
};

const listeners = new Set();
let state = load();

function blank() {
  return { v: VERSION, prefs: { ...DEFAULT_PREFS }, reading: {}, cards: {}, quiz: {}, last: null, migratedFrom: null, createdAt: Date.now() };
}

function normalize(input) {
  const base = blank();
  const s = input && typeof input === 'object' ? input : {};
  const prefs = { ...base.prefs, ...(s.prefs || {}) };
  prefs.fontSize = clamp(Number(prefs.fontSize) || DEFAULT_PREFS.fontSize, 14, 24);
  prefs.lineHeight = clamp(Number(prefs.lineHeight) || DEFAULT_PREFS.lineHeight, 1.35, 2.1);
  if (!['auto', 'light', 'dark'].includes(prefs.scheme)) prefs.scheme = 'auto';
  if (!['narrow', 'normal', 'wide'].includes(prefs.width)) prefs.width = 'normal';
  if (!['auto', 'reduced', 'full'].includes(prefs.motion)) prefs.motion = 'auto';
  prefs.haptics = prefs.haptics !== false;
  prefs.focusFullscreen = prefs.focusFullscreen === true;
  return {
    ...base,
    ...s,
    v: VERSION,
    prefs,
    reading: s.reading && typeof s.reading === 'object' ? s.reading : {},
    cards: s.cards && typeof s.cards === 'object' ? s.cards : {},
    quiz: s.quiz && typeof s.quiz === 'object' ? s.quiz : {},
  };
}

function migrate(old, from) {
  const next = blank();
  next.migratedFrom = from;
  const now = Date.now();
  if (old.palette) next.prefs.palette = old.palette;
  else if (old.theme) next.prefs.palette = legacy.PALETTE_FROM_THEME[old.theme] || 'auto';
  if (old.theme === 'paper' || old.theme === 'snow') next.prefs.scheme = 'light';
  if (old.scheme) next.prefs.scheme = old.scheme;
  if (old.font) next.prefs.font = old.font;
  if (old.fs) next.prefs.fontSize = Number(old.fs);
  if (old.lineHeight) next.prefs.lineHeight = Number(old.lineHeight);
  if (old.readerWidth) next.prefs.width = old.readerWidth;

  for (const [key, done] of Object.entries(old.done || {})) {
    if (!done) continue;
    const lectureId = key.split('::')[1];
    const target = legacy.LECTURES[lectureId];
    if (target) next.reading[target] = { done: true, pos: 1, at: now };
  }
  const statuses = { ...(old.sessionStatus || {}) };
  for (const [key, done] of Object.entries(old.sessionDone || {})) if (done && !statuses[key]) statuses[key] = 'know';
  for (const [key, status] of Object.entries(statuses)) {
    const [, examId, n] = key.split('::');
    const exam = legacy.EXAMS[examId];
    if (exam && STATUSES.includes(status) && status !== 'new') next.cards[`${exam}#${n}`] = { s: status, at: now };
  }
  for (const [qid, rate] of Object.entries(old.quizAssessment || {})) {
    const target = legacy.QUIZ[qid];
    if (target) next.cards[target] = { s: rate === 'know' ? 'know' : 'learning', at: now };
  }
  return normalize(next);
}

function load() {
  const saved = local.get(KEY, null);
  if (saved && typeof saved === 'object') return normalize(saved);
  for (const key of legacy.LEGACY_STORES) {
    const old = local.get(key, null);
    if (old && typeof old === 'object') {
      const migrated = migrate(old, key);
      local.set(KEY, migrated);
      return migrated;
    }
  }
  return blank();
}

const persist = debounce(() => local.set(KEY, state), 250);

function emit(change) {
  for (const fn of listeners) {
    try { fn(change, state); } catch (err) { console.error(err); }
  }
}

function commit(change, { silent = false } = {}) {
  persist();
  if (!silent) emit(change);
}

export function flush() { persist.flush(); }

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const getState = () => state;
export const prefs = () => state.prefs;

export function setPref(name, value) {
  state.prefs = normalize({ ...state, prefs: { ...state.prefs, [name]: value } }).prefs;
  commit({ type: 'prefs', name });
}

// Reading progress ----------------------------------------------------------

export const lectureState = (key) => state.reading[key] || null;
export const isLectureDone = (key) => Boolean(state.reading[key]?.done);

export function setLectureDone(key, done) {
  const current = state.reading[key] || {};
  state.reading[key] = { ...current, done: Boolean(done), at: Date.now() };
  commit({ type: 'reading', key });
}

export function saveReadingPosition(key, pos) {
  const current = state.reading[key] || {};
  const value = Math.round(clamp(pos, 0, 1) * 1000) / 1000;
  if (current.pos === value) return;
  state.reading[key] = { ...current, pos: value, at: Date.now() };
  state.last = key;
  commit({ type: 'position', key }, { silent: true });
}

export function touchLecture(key) {
  state.last = key;
  const current = state.reading[key] || {};
  state.reading[key] = { ...current, at: Date.now() };
  commit({ type: 'touch', key }, { silent: true });
}

// Cards: exam questions and lecture self-check questions ---------------------

export const cardStatus = (key) => state.cards[key]?.s || 'new';
export const cardState = (key) => state.cards[key] || null;

export function setCardStatus(key, status) {
  if (!STATUSES.includes(status)) return;
  const current = state.cards[key] || {};
  if (status === 'new' && !current.n) delete state.cards[key];
  else state.cards[key] = { ...current, s: status, at: Date.now() };
  commit({ type: 'card', key });
}

export const nextStatus = (status) => STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length];

/** Records a quiz answer: "know" → status know, "unknown" → learning. */
export function recordAnswer(key, grade) {
  const current = state.cards[key] || {};
  const know = grade === 'know';
  state.cards[key] = {
    ...current,
    s: know ? 'know' : 'learning',
    n: (current.n || 0) + 1,
    ok: (current.ok || 0) + (know ? 1 : 0),
    ko: (current.ko || 0) + (know ? 0 : 1),
    streak: know ? (current.streak || 0) + 1 : 0,
    at: Date.now(),
  };
  commit({ type: 'card', key });
}

/** Restores a card snapshot (used by quiz undo); null removes the card. */
export function putCard(key, value) {
  if (value) state.cards[key] = { ...value };
  else delete state.cards[key];
  commit({ type: 'card', key });
}

export function statusCounts(keys) {
  const counts = { new: 0, learning: 0, know: 0, total: keys.length };
  for (const key of keys) counts[cardStatus(key)] += 1;
  return counts;
}

// Quiz sessions (resumable) -----------------------------------------------------

export const getQuizSession = (scope) => state.quiz[scope] || null;

export function saveQuizSession(scope, session) {
  state.quiz[scope] = session;
  commit({ type: 'quiz', scope }, { silent: true });
}

export function clearQuizSession(scope) {
  delete state.quiz[scope];
  commit({ type: 'quiz', scope }, { silent: true });
}

// Data management -----------------------------------------------------------------

export function exportData() {
  return JSON.stringify({ app: 'konspekty', exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importData(text) {
  const parsed = JSON.parse(text);
  const incoming = parsed?.state || parsed;
  if (!incoming || typeof incoming !== 'object' || !incoming.prefs) throw new Error('Неверный формат файла');
  state = normalize(incoming);
  persist.flush();
  emit({ type: 'import' });
}

export function resetProgress() {
  state = { ...blank(), prefs: state.prefs };
  persist.flush();
  emit({ type: 'reset' });
}

window.addEventListener('pagehide', () => persist.flush());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist.flush(); });
