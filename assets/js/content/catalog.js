// Content catalog. The file list comes from content/manifest.json, which GitHub Pages
// (Jekyll) generates on every deploy — dropping a .md file into content/<subject>/ is
// all it takes to publish a lecture. Fallback: the GitHub tree API (public repos only).
//
// content/<subject>/subject.json      optional subject metadata
// content/<subject>/NN-slug.md        lectures (also in subfolders)
// content/<subject>/exam*.md          exam question lists with answers
// content/<subject>/materials/*       files shown in "Материалы"
// Names starting with "_" or "." are ignored (drafts).

import { local } from '../core/storage.js';
import { path as routePath } from '../core/router.js';
import { parseMarkdown } from './markdown.js';
import { humanize, parseFileName } from './slug.js';
import { texToText } from './plaintext.js';

export const CONTENT_ROOT = 'content/';
const MANIFEST_URL = `${CONTENT_ROOT}manifest.json`;
const META_KEY = 'konsp-meta-v1';
const TREE_KEY = 'konsp-tree-v1';
const BRANCH = 'main';
const RESERVED = /^(readme|index|license|contributing)\.md$/i;
const EXAM_FILE = /^exam(?:[-_.][^/]*)?\.md$/i;
const ACCENTS = ['violet', 'cyan', 'amber', 'blue', 'rose', 'emerald', 'indigo', 'mint', 'warm', 'ocean'];
const TYPE_LABELS = { pdf: 'PDF', doc: 'DOC', docx: 'DOCX', ppt: 'PPT', pptx: 'PPTX', xls: 'XLS', xlsx: 'XLSX', odt: 'ODT', rtf: 'RTF', txt: 'TXT', md: 'MD', djvu: 'DJVU', epub: 'EPUB', zip: 'ZIP', rar: 'RAR', png: 'PNG', jpg: 'JPG', jpeg: 'JPG', webp: 'WEBP', mp3: 'MP3', mp4: 'MP4' };

let catalog = null;
let loading = null;
const docPromises = new Map();
const textPromises = new Map();
const listeners = new Set();
let meta = local.get(META_KEY, {}) || {};
let saveTimer = null;

export const fileUrl = (filePath) => CONTENT_ROOT + String(filePath).split('/').map(encodeURIComponent).join('/');

function saveMetaSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => local.set(META_KEY, meta), 400);
}

function emit(type, payload) {
  for (const fn of listeners) {
    try { fn(type, payload); } catch (err) { console.error(err); }
  }
}

export function onCatalog(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const normalizePath = (p) => String(p || '').replace(/^\/+/, '').replace(/^content\//, '');

async function fromManifest() {
  const response = await fetch(MANIFEST_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`manifest.json: HTTP ${response.status}`);
  const text = await response.text();
  if (/^\s*---/.test(text)) throw new Error('manifest.json не собран (нужен Jekyll или tools/serve.mjs)');
  const data = JSON.parse(text);
  if (!Array.isArray(data.files)) throw new Error('manifest.json: нет списка files');
  return {
    source: data.generator || 'manifest',
    builtAt: data.built || null,
    files: data.files.map(normalizePath),
    pages: (data.pages || []).map(normalizePath).filter((p) => /\.md$/i.test(p)),
  };
}

async function fromGitHub() {
  const { hostname, pathname } = location;
  if (!hostname.endsWith('.github.io')) throw new Error('GitHub API доступен только на *.github.io');
  const owner = hostname.split('.')[0];
  const repo = pathname.split('/').filter(Boolean)[0] || `${owner}.github.io`;
  const cached = local.get(TREE_KEY, null);
  const headers = cached?.etag ? { 'If-None-Match': cached.etag } : {};
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${BRANCH}?recursive=1`, { headers });
  if (response.status === 304 && cached) return { source: 'github', files: cached.files, pages: [] };
  if (!response.ok) throw new Error(`GitHub API: HTTP ${response.status}`);
  const data = await response.json();
  const files = (data.tree || [])
    .filter((entry) => entry.type === 'blob' && entry.path.startsWith(CONTENT_ROOT))
    .map((entry) => normalizePath(entry.path));
  local.set(TREE_KEY, { etag: response.headers.get('ETag'), files, at: Date.now() });
  return { source: 'github', files, pages: [] };
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function hashIndex(text, size) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return Math.abs(h) % size;
}

function createSubject(folder) {
  const title = humanize(folder);
  return {
    id: folder, folder, title, short: title, icon: Array.from(title)[0]?.toUpperCase() || '•',
    accent: ACCENTS[hashIndex(folder, ACCENTS.length)], order: 1000, description: '',
    lectures: [], exams: [], materials: [], metaPath: null, extra: {},
  };
}

function cachedMeta(filePath) {
  return meta[filePath] || null;
}

function createLecture(subject, filePath, rest) {
  const segments = rest.map((segment, i) => (i === rest.length - 1 ? segment.replace(/\.md$/i, '') : segment));
  const parsed = segments.map(parseFileName);
  const slug = parsed.map((p) => p.slug).join('/');
  const cached = cachedMeta(filePath);
  const last = parsed[parsed.length - 1];
  return {
    type: 'lecture',
    subjectId: subject.id,
    slug,
    key: `${subject.id}/${slug}`,
    path: filePath,
    url: fileUrl(filePath),
    route: routePath('l', subject.id, slug),
    order: cached?.order ?? last.order,
    group: parsed.length > 1 ? humanize(parsed.slice(0, -1).map((p) => p.slug).join(' · ')) : '',
    title: cached?.title || humanize(last.slug),
    summary: cached?.summary || '',
    minutes: cached?.minutes || 0,
    questionCount: cached?.q ?? null,
    questionIds: cached?.ids || null,
    loaded: false,
  };
}

function createExam(subject, filePath, name) {
  const slug = name.replace(/\.md$/i, '');
  const cached = cachedMeta(filePath);
  return {
    type: 'exam',
    subjectId: subject.id,
    slug,
    key: `${subject.id}/${slug}`,
    path: filePath,
    url: fileUrl(filePath),
    route: routePath('e', subject.id, slug),
    title: cached?.title || (slug.toLowerCase() === 'exam' ? 'Вопросы к экзамену' : humanize(slug.replace(/^exam[-_.]?/i, '')) || 'Вопросы'),
    summary: cached?.summary || '',
    questionCount: cached?.q ?? null,
    questionIds: cached?.ids || null,
    loaded: false,
  };
}

function createMaterial(subject, filePath, rest) {
  const name = rest.slice(1).join('/');
  const file = rest[rest.length - 1];
  const ext = (/\.([^.]+)$/.exec(file)?.[1] || '').toLowerCase();
  return {
    type: 'material',
    subjectId: subject.id,
    path: filePath,
    url: fileUrl(filePath),
    name,
    ext,
    kind: TYPE_LABELS[ext] || ext.toUpperCase() || 'FILE',
    title: humanize(parseFileName(file).slug),
    description: '',
  };
}

function compareEntries(a, b) {
  if (a.group !== b.group) return String(a.group).localeCompare(String(b.group), 'ru');
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  return a.slug.localeCompare(b.slug, 'ru');
}

function applySubjectMeta(subject, data) {
  if (!data || typeof data !== 'object') return;
  for (const field of ['title', 'short', 'icon', 'accent', 'description']) if (data[field]) subject[field] = String(data[field]);
  if (data.title && !data.short) subject.short = subject.title;
  if (Number.isFinite(Number(data.order))) subject.order = Number(data.order);
  const materials = data.materials || {};
  for (const item of subject.materials) {
    const override = materials[item.name] || materials[item.name.split('/').pop()];
    if (override?.title) item.title = String(override.title);
    if (override?.description) item.description = String(override.description);
    if (Number.isFinite(Number(override?.order))) item.order = Number(override.order);
  }
  subject.materials.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title, 'ru'));
  const exams = data.exams || {};
  for (const exam of subject.exams) {
    const override = exams[exam.slug];
    if (override?.title && !exam.loaded) exam.title = String(override.title);
    if (override?.kind) exam.kind = String(override.kind);
  }
  subject.extra = data;
}

function build(listing) {
  const subjects = new Map();
  for (const filePath of listing.files) {
    const parts = filePath.split('/');
    if (parts.length < 2 || parts.some((p) => !p || p.startsWith('_') || p.startsWith('.'))) continue;
    const [folder, ...rest] = parts;
    const subject = subjects.get(folder) || createSubject(folder);
    subjects.set(folder, subject);
    const name = rest[rest.length - 1];
    if (rest.length > 1 && /^materials$/i.test(rest[0])) { subject.materials.push(createMaterial(subject, filePath, rest)); continue; }
    if (rest.length === 1 && /^subject\.json$/i.test(name)) { subject.metaPath = filePath; continue; }
    if (!/\.md$/i.test(name) || RESERVED.test(name)) continue;
    if (rest.length === 1 && EXAM_FILE.test(name)) { subject.exams.push(createExam(subject, filePath, name)); continue; }
    subject.lectures.push(createLecture(subject, filePath, rest));
  }
  for (const subject of subjects.values()) {
    subject.lectures.sort(compareEntries);
    subject.exams.sort((a, b) => (a.slug === 'exam' ? -1 : b.slug === 'exam' ? 1 : a.slug.localeCompare(b.slug)));
  }
  return subjects;
}

function finalize(listing, subjects) {
  const list = Array.from(subjects.values())
    .filter((s) => s.lectures.length || s.exams.length || s.materials.length)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ru'));
  const byPath = new Map();
  for (const subject of list) for (const entry of [...subject.lectures, ...subject.exams, ...subject.materials]) byPath.set(entry.path, entry);
  const known = new Set(byPath.keys());
  let pruned = false;
  for (const key of Object.keys(meta)) if (!known.has(key)) { delete meta[key]; pruned = true; }
  if (pruned) saveMetaSoon();
  return {
    source: listing.source,
    builtAt: listing.builtAt || null,
    subjects: list,
    byPath,
    warnings: listing.pages.map((p) => `Файл ${p} начинается с блока «---» и не опубликован как Markdown — уберите этот блок.`),
  };
}

export async function loadCatalog({ force = false } = {}) {
  if (catalog && !force) return catalog;
  if (loading && !force) return loading;
  loading = (async () => {
    let listing;
    const errors = [];
    for (const source of [fromManifest, fromGitHub]) {
      try { listing = await source(); break; } catch (err) { errors.push(err.message); }
    }
    if (!listing) {
      const error = new Error('Не удалось получить список материалов');
      error.details = errors;
      throw error;
    }
    const subjects = build(listing);
    await Promise.all(Array.from(subjects.values()).map(async (subject) => {
      if (subject.metaPath) applySubjectMeta(subject, await fetchJson(fileUrl(subject.metaPath)));
    }));
    catalog = finalize(listing, subjects);
    if (force) { docPromises.clear(); textPromises.clear(); }
    emit('catalog', catalog);
    return catalog;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

export const getCatalog = () => catalog;
export const getSubject = (id) => catalog?.subjects.find((s) => s.id === id) || null;
export const getLecture = (subjectId, slug) => getSubject(subjectId)?.lectures.find((l) => l.slug === slug) || null;
export const getExam = (subjectId, slug) => getSubject(subjectId)?.exams.find((e) => e.slug === slug) || null;
export const allDocs = () => (catalog ? catalog.subjects.flatMap((s) => [...s.lectures, ...s.exams]) : []);
export const allMaterials = () => (catalog ? catalog.subjects.flatMap((s) => s.materials) : []);

function attach(entry, doc, hash) {
  for (const q of doc.questions) {
    q.key = `${entry.key}#${q.id}`;
    q.entryKey = entry.key;
  }
  const next = {
    h: hash,
    title: doc.title || entry.title,
    summary: texToText(doc.leadText).slice(0, 240),
    minutes: doc.minutes,
    q: doc.questions.length,
    ids: doc.questions.map((q) => q.id),
    order: doc.meta.order != null && Number.isFinite(Number(doc.meta.order)) ? Number(doc.meta.order) : undefined,
  };
  const reorder = next.order !== undefined && next.order !== entry.order;
  Object.assign(entry, {
    title: next.title,
    summary: next.summary,
    minutes: next.minutes,
    questionCount: next.q,
    questionIds: next.ids,
    hasMath: doc.hasMath,
    loaded: true,
  });
  if (next.order !== undefined) entry.order = next.order;
  if (reorder && entry.type === 'lecture') getSubject(entry.subjectId)?.lectures.sort(compareEntries);
  const previous = JSON.stringify(meta[entry.path] || null);
  meta[entry.path] = next;
  if (previous !== JSON.stringify(next)) {
    saveMetaSoon();
    emit('entry', entry);
  }
}

/** Cheap content fingerprint (FNV-1a + length) to skip re-parsing unchanged files. */
function fingerprint(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return `${(h >>> 0).toString(36)}.${text.length}`;
}

function fetchText(entry) {
  if (textPromises.has(entry.path)) return textPromises.get(entry.path);
  const promise = fetch(entry.url).then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  });
  promise.catch(() => textPromises.delete(entry.path));
  textPromises.set(entry.path, promise);
  return promise;
}

const yieldToMain = () => new Promise((resolve) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 600 });
  else setTimeout(resolve, 30);
});

/** Loads and parses a lecture or exam document (memoized per catalog). */
export function loadDoc(entry) {
  if (!entry) return Promise.reject(new Error('Документ не найден'));
  if (docPromises.has(entry.path)) return docPromises.get(entry.path);
  const promise = fetchText(entry).then((text) => {
    const doc = parseMarkdown(text, { kind: entry.type === 'exam' ? 'exam' : 'lecture' });
    attach(entry, doc, fingerprint(text));
    return doc;
  });
  promise.catch(() => docPromises.delete(entry.path));
  docPromises.set(entry.path, promise);
  return promise;
}

export const peekDoc = (entry) => docPromises.get(entry?.path) || null;

let prefetching = null;
/** Loads every document in the background (titles, counts, search index). */
export function prefetchAll() {
  if (prefetching) return prefetching;
  const queue = allDocs();
  prefetching = (async () => {
    // Download everything in parallel (HTTP-cached), but parse one file at a time and only
    // when its content changed since the cached metadata was built.
    const texts = queue.map((entry) => fetchText(entry).catch(() => null));
    for (let i = 0; i < queue.length; i += 1) {
      const entry = queue[i];
      const text = await texts[i];
      if (text == null || docPromises.has(entry.path)) continue;
      if (meta[entry.path]?.h === fingerprint(text) && entry.questionIds) continue;
      await yieldToMain();
      try { await loadDoc(entry); } catch { /* shown when opened */ }
    }
    emit('prefetched');
  })().finally(() => { prefetching = null; });
  return prefetching;
}

/** Resolves a link found inside a document relative to that document's path. */
export function resolveLink(fromPath, href) {
  const value = String(href || '').trim();
  if (!value) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) return { type: 'external', url: value };
  if (value.startsWith('#')) return { type: 'anchor', id: value.slice(1) };
  const [pathPart, fragment = ''] = value.split('#');
  const base = String(fromPath || '').split('/').slice(0, -1);
  const stack = pathPart.startsWith('/') ? [] : base;
  for (const segment of pathPart.replace(/^\/+/, '').split('/')) {
    let decoded = segment;
    try { decoded = decodeURIComponent(segment); } catch { /* keep */ }
    if (!decoded || decoded === '.') continue;
    if (decoded === '..') stack.pop();
    else stack.push(decoded);
  }
  const target = stack.join('/').replace(/^content\//, '');
  const entry = catalog?.byPath.get(target);
  if (entry && entry.type !== 'material') return { type: 'route', route: entry.route, fragment };
  return { type: 'file', url: fileUrl(target) };
}
