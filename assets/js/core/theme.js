// Palettes, color math and appearance preferences → CSS custom properties.

import { prefs } from './store.js';
import { inTelegram, setChromeColors, telegramTheme } from './telegram.js';

export const PALETTES = [
  { id: 'violet', name: 'Фиолет', dark: ['#08070f', '#9383ff', '#4fd8ff'], light: ['#f6f4ff', '#6a50e0', '#0f8fb3'] },
  { id: 'blue', name: 'Синий', dark: ['#060b16', '#5c9dff', '#45e0ff'], light: ['#f1f6ff', '#2f6fdc', '#0f8eb0'] },
  { id: 'indigo', name: 'Индиго', dark: ['#080a18', '#7a8cff', '#c07bff'], light: ['#f3f4ff', '#4c5fd6', '#8445c2'] },
  { id: 'cyan', name: 'Бирюза', dark: ['#041113', '#3fd6e0', '#7df0a4'], light: ['#ecfafb', '#13949d', '#2e9657'] },
  { id: 'ocean', name: 'Океан', dark: ['#041215', '#2fc2ee', '#58e6c0'], light: ['#edf9fb', '#1288ab', '#1f8a6c'] },
  { id: 'emerald', name: 'Изумруд', dark: ['#05110d', '#3ddc97', '#b4f25a'], light: ['#effaf5', '#1f9463', '#5c9a14'] },
  { id: 'mint', name: 'Мята', dark: ['#05120f', '#4fe0b0', '#c0f06e'], light: ['#effbf6', '#219a73', '#6f9d1c'] },
  { id: 'amber', name: 'Янтарь', dark: ['#110d04', '#f5b83d', '#ffe16b'], light: ['#fff9e8', '#b27808', '#93800e'] },
  { id: 'warm', name: 'Закат', dark: ['#120b06', '#ff9d57', '#ffd36e'], light: ['#fff7ef', '#c46520', '#a07c10'] },
  { id: 'crimson', name: 'Кармин', dark: ['#13070b', '#ff5f7e', '#ffb45e'], light: ['#fff2f5', '#d23f5c', '#c2711d'] },
  { id: 'rose', name: 'Роза', dark: ['#12060e', '#f472c2', '#b28cff'], light: ['#fff1f9', '#c7458f', '#7048cf'] },
  { id: 'graphite', name: 'Графит', dark: ['#0b0d11', '#b7c3d4', '#7fd4e6'], light: ['#f3f4f6', '#4e5b6c', '#1b7d91'] },
];

export const FONTS = [
  { id: 'system', name: 'Системный', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  { id: 'humanist', name: 'Гуманист', stack: '"Segoe UI", "Trebuchet MS", "PT Sans", Roboto, Arial, sans-serif' },
  { id: 'rounded', name: 'Округлый', stack: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif' },
  { id: 'geometric', name: 'Геометрик', stack: '"Avenir Next", "Century Gothic", "Montserrat", "Segoe UI", sans-serif' },
  { id: 'serif', name: 'Книжный', stack: '"Iowan Old Style", "Palatino Linotype", Palatino, "PT Serif", Georgia, serif' },
  { id: 'classic', name: 'Классика', stack: 'Georgia, "Times New Roman", "PT Serif", serif' },
  { id: 'compact', name: 'Компактный', stack: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif' },
  { id: 'mono', name: 'Моно', stack: 'ui-monospace, "SF Mono", "JetBrains Mono", Consolas, "Liberation Mono", monospace' },
];

export const WIDTHS = { narrow: 640, normal: 760, wide: 920 };

// Color math ---------------------------------------------------------------

function parseHex(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => toHex(parseHex(a).map((v, i) => v + (parseHex(b)[i] - v) * t));
const rgbList = (hex) => parseHex(hex).join(' ');

function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

function rotateHue(hex, degrees) {
  const [r, g, b] = parseHex(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  h = (h + degrees + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]);
}

// Resolution -----------------------------------------------------------------

export function resolvedScheme() {
  const p = prefs();
  if (p.scheme !== 'auto') return p.scheme;
  const telegram = telegramTheme();
  if (telegram) return telegram.scheme;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function telegramPalette(scheme) {
  const telegram = telegramTheme();
  const params = telegram?.params || {};
  const fallback = PALETTES[0][scheme];
  const bg = parseHex(params.bg_color) ? params.bg_color : fallback[0];
  const accent = [params.button_color, params.accent_text_color, params.link_color].find((c) => parseHex(c)) || fallback[1];
  const accent2 = rotateHue(accent, 42);
  const text = parseHex(params.text_color) ? params.text_color : null;
  return { bg, accent, accent2, text };
}

export function paletteColors(id, scheme) {
  if (id === 'auto') {
    if (inTelegram) return telegramPalette(scheme);
    id = 'violet';
  }
  const palette = PALETTES.find((p) => p.id === id) || PALETTES[0];
  const [bg, accent, accent2] = palette[scheme];
  return { bg, accent, accent2, text: null };
}

function tokens(scheme, { bg, accent, accent2, text }) {
  const dark = scheme === 'dark';
  const baseText = text || (dark ? mix('#f5f4fb', accent, 0.05) : mix('#14121d', accent, 0.08));
  const surface = dark ? mix(bg, '#ffffff', 0.05) : mix('#ffffff', bg, 0.22);
  const surface2 = dark ? mix(bg, '#ffffff', 0.09) : mix(bg, '#1a1830', 0.035);
  const onAccent = contrast(accent, '#ffffff') >= contrast(accent, '#0b0a12') ? '#ffffff' : '#0b0a12';
  return {
    '--bg': bg,
    '--bg-rgb': rgbList(bg),
    '--surface': surface,
    '--surface-rgb': rgbList(surface),
    '--surface-2': surface2,
    '--surface-2-rgb': rgbList(surface2),
    '--text': baseText,
    '--text-rgb': rgbList(baseText),
    '--text-2': mix(baseText, bg, dark ? 0.3 : 0.32),
    '--text-3': mix(baseText, bg, dark ? 0.5 : 0.5),
    '--accent': accent,
    '--accent-rgb': rgbList(accent),
    '--accent-2': accent2,
    '--accent-2-rgb': rgbList(accent2),
    '--accent-text': dark ? mix(accent, '#ffffff', 0.22) : mix(accent, '#000000', 0.12),
    '--on-accent': onAccent,
  };
}

export function applyAppearance() {
  const p = prefs();
  const scheme = resolvedScheme();
  const colors = paletteColors(p.palette, scheme);
  const root = document.documentElement;
  const vars = tokens(scheme, colors);
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  const font = FONTS.find((f) => f.id === p.font) || FONTS[0];
  root.style.setProperty('--font-reading', font.stack);
  root.style.setProperty('--reader-size', `${p.fontSize}px`);
  root.style.setProperty('--reader-leading', String(p.lineHeight));
  root.style.setProperty('--reader-width', `${WIDTHS[p.width] || WIDTHS.normal}px`);
  root.dataset.scheme = scheme;
  root.dataset.palette = p.palette;
  const reduce = p.motion === 'reduced' || (p.motion === 'auto' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  root.dataset.motion = reduce ? 'reduced' : 'full';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.bg);
  setChromeColors(colors.bg);
  return { scheme, colors };
}

export const motionReduced = () => document.documentElement.dataset.motion === 'reduced';

export function previewSwatch(id, scheme = resolvedScheme()) {
  return paletteColors(id, scheme);
}
