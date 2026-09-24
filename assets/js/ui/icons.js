// Inline stroke icons (24×24, currentColor).

import { raw } from '../core/dom.js';

const PATHS = {
  home: '<path d="M3.5 10.5 12 3.8l8.5 6.7"/><path d="M5.5 9.3V19a1.5 1.5 0 0 0 1.5 1.5h3.2v-5.8h3.6v5.8H17a1.5 1.5 0 0 0 1.5-1.5V9.3"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="6.8"/><path d="m20 20-4.2-4.2"/>',
  folder: '<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.8l2 2.2h7.2a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>',
  back: '<path d="m14.5 18-6-6 6-6"/>',
  chevron: '<path d="m9.5 18 6-6-6-6"/>',
  down: '<path d="m6 9.5 6 6 6-6"/>',
  book: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v14.5H7.5A2.5 2.5 0 0 0 5 20Z"/><path d="M5 20a1 1 0 0 0 1 1h13v-3.5"/>',
  check: '<path d="M20 6.5 9.5 17 4 11.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  expand: '<path d="M8.5 3.5h-3a2 2 0 0 0-2 2v3M20.5 8.5v-3a2 2 0 0 0-2-2h-3M3.5 15.5v3a2 2 0 0 0 2 2h3M15.5 20.5h3a2 2 0 0 0 2-2v-3"/>',
  collapse: '<path d="M8.5 3.5v3a2 2 0 0 1-2 2h-3M20.5 8.5h-3a2 2 0 0 1-2-2v-3M3.5 15.5h3a2 2 0 0 1 2 2v3M15.5 20.5v-3a2 2 0 0 1 2-2h3"/>',
  play: '<path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l10.6-6.8a1 1 0 0 0 0-1.72L9.5 4.34A1 1 0 0 0 8 5.2Z"/>',
  shuffle: '<path d="M16.5 3.5h4v4M4 20 20.5 3.5M20.5 16.5v4h-4M15 15l5.5 5.5M4 4l5 5"/>',
  repeat: '<path d="M4 11.5a8 8 0 0 1 14-5.3L20 8.5"/><path d="M20 3.5v5h-5"/><path d="M20 12.5a8 8 0 0 1-14 5.3L4 15.5"/><path d="M4 20.5v-5h5"/>',
  sparkles: '<path d="M11 3.5 12.7 8l4.5 1.7-4.5 1.7L11 16l-1.7-4.6L4.8 9.7 9.3 8Z"/><path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  file: '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8Z"/><path d="M14 3.5V8h4.5"/>',
  external: '<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r="1" fill="currentColor"/><circle cx="4.8" cy="12" r="1" fill="currentColor"/><circle cx="4.8" cy="17.5" r="1" fill="currentColor"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.3A7.8 7.8 0 1 1 9.7 4.5a6.2 6.2 0 0 0 9.8 9.8Z"/>',
  cards: '<rect x="3.5" y="7" width="13" height="13.5" rx="2.2"/><path d="M8 3.5h10.3a2.2 2.2 0 0 1 2.2 2.2V16"/>',
  trophy: '<path d="M8 20.5h8M12 16.5v4M7.5 4h9v5a4.5 4.5 0 0 1-9 0Z"/><path d="M7.5 6H4.5v1a3 3 0 0 0 3 3M16.5 6h3v1a3 3 0 0 1-3 3"/>',
  undo: '<path d="M9 14.5 4.5 10 9 5.5"/><path d="M4.5 10H15a4.5 4.5 0 0 1 0 9h-3"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  download: '<path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M5 20.5h14"/>',
  upload: '<path d="M12 20.5v-11M7.5 14l4.5-4.5 4.5 4.5M5 3.5h14"/>',
  trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7M9.5 7V4.5h5V7"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  arrow: '<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>',
  cap: '<path d="m2.5 9.5 9.5-5 9.5 5-9.5 5Z"/><path d="M6.5 11.6v4.6c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-4.6M21.5 9.5v5"/>',
  bolt: '<path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6Z"/>',
  flag: '<path d="M5 21V4.5M5 4.5h11l-2 4 2 4H5"/>',
  text: '<path d="M5 19 10.5 5h1L17 19M7.2 13.5h7.6"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.5-1-2.6 0-.9.7-1.6 1.7-1.6h2a4 4 0 0 0 4-4c0-4-3.8-7.1-8.5-7.1Z"/><circle cx="7.5" cy="11.5" r="1" fill="currentColor"/><circle cx="10" cy="7.5" r="1" fill="currentColor"/><circle cx="14.5" cy="7.5" r="1" fill="currentColor"/>',
  hand: '<path d="M8 13V5.8a1.5 1.5 0 0 1 3 0V11M11 10.5V4.3a1.5 1.5 0 0 1 3 0v6.2M14 10.5V5.8a1.5 1.5 0 0 1 3 0V14a6.5 6.5 0 0 1-6.5 6.5A6.4 6.4 0 0 1 5 17.2l-1.6-3a1.5 1.5 0 0 1 2.6-1.5L8 15"/>',
  wave: '<path d="M3 12h2.5l2-5 3 10 3-12 3 9 1.5-2H21"/>',
};

export function icon(name, { size = 22, className = '' } = {}) {
  const body = PATHS[name] || PATHS.info;
  return raw(`<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`);
}
