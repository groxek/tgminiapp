// Focus Mode: hides app chrome while reading. Optional Telegram fullscreen on phones.

import { prefs } from '../core/store.js';
import { haptic, isMobileTelegram, setFullscreen } from '../core/telegram.js';

const listeners = new Set();

export const isFocus = () => document.documentElement.classList.contains('is-focus');

export function setFocus(on, { silent = false } = {}) {
  const next = Boolean(on);
  if (next === isFocus()) return;
  document.documentElement.classList.toggle('is-focus', next);
  if (prefs().focusFullscreen && isMobileTelegram()) setFullscreen(next);
  if (!silent) haptic.impact(next ? 'medium' : 'light');
  listeners.forEach((fn) => fn(next));
}

export const toggleFocus = () => setFocus(!isFocus());

export function onFocusChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
