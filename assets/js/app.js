// App shell: routing → views, chrome (top bar, tabs, sidebar), transitions, global input.

import { $, html, debounce, onIdle, percent } from './core/dom.js';
import { DEPTH, canGoBack, go, href, initIndex, parse, path, trackDirection } from './core/router.js';
import * as store from './core/store.js';
import * as legacy from './core/legacy.js';
import { haptic, initTelegram, onTelegramTheme, openLink, setBackButton } from './core/telegram.js';
import { applyAppearance, motionReduced } from './core/theme.js';
import { getCatalog, loadCatalog, onCatalog, prefetchAll } from './content/catalog.js';
import { invalidateIndex } from './content/search.js';
import { errorState, skeleton, statusChip, subjectGlyph, subjectProgress } from './ui/components.js';
import { icon } from './ui/icons.js';
import { isFocus, onFocusChange, setFocus } from './ui/focus.js';
import { toast } from './ui/toast.js';
import { APP_NAME } from './config.js';

import home from './views/home.js';
import subject from './views/subject.js';
import lecture from './views/lecture.js';
import exam from './views/exam.js';
import question from './views/question.js';
import quiz from './views/quiz.js';
import session from './views/session.js';
import materials from './views/materials.js';
import search from './views/search.js';
import settings from './views/settings.js';
import notfound from './views/notfound.js';

const VIEWS = { home, subject, lecture, exam, question, quiz, session, materials, search, settings, notfound };
const TABS = [
  { id: 'home', label: 'Главная', icon: 'home', route: '/' },
  { id: 'session', label: 'Сессия', icon: 'target', route: '/session' },
  { id: 'search', label: 'Поиск', icon: 'search', route: '/search' },
  { id: 'materials', label: 'Файлы', icon: 'folder', route: '/materials' },
  { id: 'settings', label: 'Настройки', icon: 'sliders', route: '/settings' },
];

const screen = () => $('#screen');
const current = { view: null, ctx: null, data: null, chrome: null, cleanup: null, hash: '' };
const scrollMemory = new Map();
let renderToken = 0;

// Chrome -----------------------------------------------------------------------

function navMarkup(className) {
  return html`${TABS.map((tab) => html`<a class="${className}" href="${href(tab.route)}" data-tab="${tab.id}" data-haptic="select">
    ${icon(tab.icon, { size: 22 })}<span>${tab.label}</span>
  </a>`)}`;
}

function renderSidebarSubjects() {
  const box = $('#sidebarSubjects');
  const catalog = getCatalog();
  if (!box || !catalog) return;
  const active = current.ctx?.params?.subject;
  box.innerHTML = String(html`${catalog.subjects.map((s) => {
    const { lectures, read, counts } = subjectProgress(s);
    const value = lectures ? percent(read, lectures) : percent(counts.know, counts.total);
    return html`<a class="side-subject ${s.id === active ? 'is-active' : ''}" href="${href(path('s', s.id))}" ${s.id === active ? 'aria-current="page"' : ''}>
      ${subjectGlyph(s, { size: 'glyph--xs' })}<span>${s.title}</span><small>${value}%</small>
    </a>`;
  })}`);
}

function setChrome(chrome, view) {
  current.chrome = chrome;
  $('#screenTitle').textContent = chrome.title || APP_NAME;
  $('#crumb').textContent = chrome.crumb || '';
  document.title = chrome.title && chrome.title !== APP_NAME ? `${chrome.title} — ${APP_NAME}` : APP_NAME;
  const hasBack = Boolean(chrome.back);
  document.documentElement.classList.toggle('has-back', hasBack);
  $('#backBtn').hidden = !hasBack;
  $('#topActions').innerHTML = chrome.actions ? String(chrome.actions) : '';
  const tab = view?.tab;
  for (const el of document.querySelectorAll('[data-tab]')) {
    const on = el.dataset.tab === tab;
    el.classList.toggle('is-active', on);
    if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  }
  setBackButton(hasBack || isFocus());
  renderSidebarSubjects();
}

// Rendering ----------------------------------------------------------------------

function swap(markup, { animate = true, direction = 'none', after } = {}) {
  const root = screen();
  const apply = () => {
    root.innerHTML = String(markup);
    after?.();
  };
  if (animate && document.startViewTransition && !motionReduced() && document.visibilityState === 'visible') {
    document.documentElement.dataset.nav = direction;
    const transition = document.startViewTransition(apply);
    // A transition is skipped when the viewport changes mid-way (Telegram expand, keyboard):
    // the DOM update still happens, only the animation is dropped.
    transition.ready.catch(() => {});
    transition.finished.catch(() => {}).finally(() => { delete document.documentElement.dataset.nav; });
    return transition.updateCallbackDone.catch(() => {});
  }
  apply();
  if (animate && !motionReduced()) {
    root.classList.remove('screen-enter', 'screen-enter--back');
    void root.offsetWidth;
    root.classList.add(direction === 'back' ? 'screen-enter--back' : 'screen-enter');
  }
  return Promise.resolve();
}

function legacyRedirect(parts) {
  const [head, a, b] = parts;
  if (head === 'subject' && legacy.SUBJECTS[a]) return path('s', legacy.SUBJECTS[a]);
  if (head === 'lecture' || head === 'quiz') {
    const key = legacy.LECTURE_NUMBERS[`${a}/${b}`];
    if (key) {
      const [subjectId, slug] = key.split('/');
      return head === 'quiz' ? path('q', 'l', subjectId, slug) : path('l', subjectId, slug);
    }
    if (head === 'quiz' && legacy.SUBJECTS[a]) return path('q', 's', legacy.SUBJECTS[a]);
  }
  if (head === 'session' && legacy.EXAMS[a]) {
    const [subjectId, slug] = legacy.EXAMS[a].split('/');
    return b === 'train' || b === 'random' ? path('q', 'e', subjectId, slug) : path('e', subjectId, slug);
  }
  if (head === 'english') return path('s', 'english');
  return null;
}

async function render({ refresh = false } = {}) {
  const route = parse();
  if (route.name === 'notfound') {
    const target = legacyRedirect(route.parts);
    if (target) { go(target, { replace: true }); return; }
  }
  const view = VIEWS[route.name] || notfound;
  const direction = refresh ? 'none' : current.direction || 'none';
  const token = ++renderToken;
  const keepScroll = refresh ? window.scrollY : null;

  current.cleanup?.();
  current.cleanup = null;
  if (!refresh && current.view === lecture && view !== lecture) setFocus(false, { silent: true });

  const ctx = { route, params: route.params, query: route.query, direction, view, refresh: () => render({ refresh: true }) };
  current.view = view;
  current.ctx = ctx;
  current.data = null;

  let showedSkeleton = false;
  const slow = refresh ? null : setTimeout(() => {
    if (token !== renderToken) return;
    showedSkeleton = true;
    swap(skeleton(view.skeleton), { animate: true, direction });
  }, 140);

  let data = null;
  let error = null;
  try {
    if (view.needsCatalog !== false) ctx.catalog = await loadCatalog();
    else ctx.catalog = getCatalog();
    data = view.load ? await view.load(ctx) : {};
  } catch (err) {
    error = err;
  }
  clearTimeout(slow);
  if (token !== renderToken) return;

  if (error) {
    setChrome({ title: 'Ошибка', crumb: APP_NAME, back: route.name === 'home' ? false : '/' }, view);
    await swap(errorState(error), { animate: !refresh && !showedSkeleton, direction });
    return;
  }
  current.data = data;
  setChrome(view.chrome ? view.chrome(ctx, data) : { title: APP_NAME }, view);
  await swap(view.render(ctx, data), {
    animate: !refresh && !showedSkeleton,
    direction,
    after: () => {
      if (keepScroll != null) window.scrollTo(0, keepScroll);
      else if (direction === 'back' && scrollMemory.has(location.hash)) window.scrollTo(0, scrollMemory.get(location.hash));
      else window.scrollTo(0, 0);
      current.cleanup = view.mount?.(screen(), ctx, data) || null;
    },
  });
  if (!refresh) screen().focus({ preventScroll: true });
}

const refreshSoon = debounce(() => render({ refresh: true }), 160);

function onHashChange() {
  if (current.hash) scrollMemory.set(current.hash, window.scrollY);
  current.hash = location.hash;
  current.direction = trackDirection();
  const prevDepth = DEPTH[current.ctx?.route?.name] ?? 0;
  const nextDepth = DEPTH[parse().name] ?? 0;
  if (current.direction === 'forward' && nextDepth < prevDepth && !canGoBack()) current.direction = 'back';
  render();
}

function goBack() {
  if (isFocus()) { setFocus(false); setBackButton(Boolean(current.chrome?.back)); return; }
  const back = current.chrome?.back;
  if (!back) return;
  if (canGoBack()) history.back();
  else go(typeof back === 'string' ? back : '/', { replace: true });
}

// Global actions ------------------------------------------------------------------

const GLOBAL_ACTIONS = {
  back: () => goBack(),
  async retry() {
    try { await loadCatalog({ force: true }); } catch { /* shown by render */ }
    render({ refresh: true });
  },
  'cycle-status'(el) {
    const key = el.dataset.key;
    const next = store.nextStatus(store.cardStatus(key));
    store.setCardStatus(key, next);
    if (next === 'know') haptic.notify('success'); else haptic.select();
    const compact = el.classList.contains('status-chip--compact');
    el.outerHTML = String(statusChip(key, { size: compact ? 'status-chip--compact' : '' }));
    document.dispatchEvent(new CustomEvent('status-changed', { detail: { key, status: next } }));
  },
  async 'copy-code'(el) {
    const code = el.closest('pre')?.querySelector('code')?.textContent || '';
    try {
      await navigator.clipboard.writeText(code);
      toast('Скопировано');
      haptic.impact('light');
    } catch {
      toast('Не удалось скопировать');
    }
  },
};

function onClick(event) {
  const actionEl = event.target.closest('[data-action]');
  if (actionEl && !actionEl.disabled) {
    const name = actionEl.dataset.action;
    const handler = current.view?.actions?.[name] || GLOBAL_ACTIONS[name];
    if (handler) {
      event.preventDefault();
      handler(actionEl, event, current.ctx, current.data);
      return;
    }
  }
  const link = event.target.closest('a[href]');
  if (!link) return;
  if (link.hasAttribute('data-external') || link.hasAttribute('data-file')) {
    event.preventDefault();
    haptic.impact('light');
    openLink(link.getAttribute('href'));
    return;
  }
  const feel = link.dataset.haptic;
  if (feel === 'select') haptic.select();
  else if (feel && feel !== 'none') haptic.impact(feel);
}

function onKeyDown(event) {
  const tag = event.target?.tagName?.toLowerCase();
  const typing = ['input', 'textarea', 'select'].includes(tag) || event.target?.isContentEditable;
  if (event.key === 'Escape') {
    if (isFocus()) { event.preventDefault(); goBack(); }
    else if (typing) event.target.blur();
    return;
  }
  if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === '/') { event.preventDefault(); go('/search'); return; }
  const handler = current.view?.keys?.[event.key];
  if (handler && current.data) {
    if (event.target.closest?.('button, a') && (event.key === ' ' || event.key === 'Enter')) return;
    event.preventDefault();
    handler(current.ctx, current.data);
  }
}

// Boot -----------------------------------------------------------------------------

export function start() {
  applyAppearance();
  $('#tabbar').innerHTML = String(navMarkup('tab'));
  $('#sideNav').innerHTML = String(navMarkup('side-link'));
  initTelegram({ onBack: goBack, onSettings: () => go('/settings') });
  initIndex();

  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('hashchange', onHashChange);
  onTelegramTheme(() => applyAppearance());
  for (const query of ['(prefers-color-scheme: light)', '(prefers-reduced-motion: reduce)']) {
    window.matchMedia?.(query).addEventListener?.('change', () => { applyAppearance(); if (current.view === settings) render({ refresh: true }); });
  }
  onFocusChange((on) => setBackButton(on || Boolean(current.chrome?.back)));
  let scrolled = false;
  window.addEventListener('scroll', () => {
    const next = window.scrollY > 4;
    if (next !== scrolled) { scrolled = next; document.documentElement.classList.toggle('is-scrolled', next); }
  }, { passive: true });

  store.subscribe((change) => {
    if (change.type === 'prefs') return;
    if (current.view?.onChange?.(change.type)) refreshSoon();
    else renderSidebarSubjects();
  });
  onCatalog((type) => {
    if (type === 'catalog' || type === 'prefetched') invalidateIndex();
    if (current.view?.onChange?.(type)) refreshSoon();
    else if (type !== 'entry') renderSidebarSubjects();
  });

  current.hash = location.hash;
  render().then(() => {
    onIdle(() => { prefetchAll().catch(() => {}); }, 2000);
    document.documentElement.classList.add('is-ready');
  });

  if (new URLSearchParams(location.search).has('qa')) {
    window.__KONSP_QA__ = {
      state: () => JSON.parse(JSON.stringify(store.getState())),
      route: () => current.ctx?.route,
      catalog: () => getCatalog(),
      go,
      render: () => render({ refresh: true }),
    };
  }
}
