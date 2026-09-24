// Telegram WebApp integration. The SDK also defines Telegram.WebApp in a normal browser
// (platform "unknown"), so real Mini App mode is detected explicitly.

import { prefs } from './store.js';

export const tg = window.Telegram?.WebApp ?? null;
export const inTelegram = Boolean(tg && tg.platform && tg.platform !== 'unknown');

const atLeast = (version) => Boolean(inTelegram && tg.isVersionAtLeast?.(version));

function safeCall(fn) {
  try { return fn(); } catch { return undefined; }
}

function updateInsets() {
  const root = document.documentElement.style;
  const safe = (inTelegram && tg.safeAreaInset) || {};
  const content = (inTelegram && tg.contentSafeAreaInset) || {};
  for (const side of ['top', 'right', 'bottom', 'left']) {
    root.setProperty(`--tg-safe-${side}`, `${(safe[side] || 0) + (content[side] || 0)}px`);
  }
  if (inTelegram && tg.viewportStableHeight) root.setProperty('--tg-viewport-stable', `${tg.viewportStableHeight}px`);
}

let backHandler = null;
let settingsHandler = null;
const themeListeners = new Set();

export function initTelegram({ onBack, onSettings } = {}) {
  document.documentElement.dataset.telegram = inTelegram ? tg.platform : 'none';
  updateInsets();
  if (!inTelegram) return;
  backHandler = onBack;
  settingsHandler = onSettings;
  safeCall(() => tg.ready());
  safeCall(() => tg.expand());
  if (atLeast('7.7')) safeCall(() => tg.disableVerticalSwipes());
  if (atLeast('6.1')) safeCall(() => tg.BackButton.onClick(() => backHandler?.()));
  if (atLeast('7.0') && tg.SettingsButton) {
    safeCall(() => tg.SettingsButton.onClick(() => settingsHandler?.()));
    safeCall(() => tg.SettingsButton.show());
  }
  for (const event of ['viewportChanged', 'safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged']) {
    safeCall(() => tg.onEvent(event, updateInsets));
  }
  safeCall(() => tg.onEvent('themeChanged', () => themeListeners.forEach((fn) => fn())));
}

export function onTelegramTheme(fn) {
  themeListeners.add(fn);
  return () => themeListeners.delete(fn);
}

export function setBackButton(visible) {
  if (!atLeast('6.1')) return;
  safeCall(() => (visible ? tg.BackButton.show() : tg.BackButton.hide()));
}

export function setChromeColors(color) {
  if (!inTelegram) return;
  if (atLeast('6.9')) safeCall(() => tg.setHeaderColor(color));
  else if (atLeast('6.1')) safeCall(() => tg.setHeaderColor('bg_color'));
  if (atLeast('6.1')) safeCall(() => tg.setBackgroundColor(color));
  if (atLeast('7.10')) safeCall(() => tg.setBottomBarColor(color));
}

export function telegramTheme() {
  if (!inTelegram) return null;
  return { scheme: tg.colorScheme === 'light' ? 'light' : 'dark', params: tg.themeParams || {} };
}

export function telegramUser() {
  return inTelegram ? tg.initDataUnsafe?.user || null : null;
}

export const haptic = {
  impact(style = 'light') {
    if (prefs().haptics && atLeast('6.1')) safeCall(() => tg.HapticFeedback.impactOccurred(style));
  },
  notify(type = 'success') {
    if (prefs().haptics && atLeast('6.1')) safeCall(() => tg.HapticFeedback.notificationOccurred(type));
  },
  select() {
    if (prefs().haptics && atLeast('6.1')) safeCall(() => tg.HapticFeedback.selectionChanged());
  },
};

export function openLink(url) {
  const absolute = new URL(url, location.href).href;
  if (inTelegram && tg.openLink) {
    safeCall(() => tg.openLink(absolute));
    return;
  }
  const win = window.open(absolute, '_blank', 'noopener');
  if (!win) location.href = absolute;
}

/** Native Telegram confirm when available, window.confirm otherwise. */
export function confirmDialog(message) {
  if (atLeast('6.2') && tg.showConfirm) {
    return new Promise((resolve) => {
      try { tg.showConfirm(message, (ok) => resolve(Boolean(ok))); } catch { resolve(window.confirm(message)); }
    });
  }
  return Promise.resolve(window.confirm(message));
}

export function setFullscreen(on) {
  if (!atLeast('8.0')) return;
  if (on && !tg.isFullscreen) safeCall(() => tg.requestFullscreen());
  if (!on && tg.isFullscreen) safeCall(() => tg.exitFullscreen());
}

export const isMobileTelegram = () => inTelegram && ['android', 'ios'].includes(tg.platform);
