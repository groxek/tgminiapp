// Client-side full-text search over every loaded lecture, exam question and material.

import { href, path as routePath } from '../core/router.js';
import { esc } from '../core/dom.js';
import { allDocs, allMaterials, getSubject, loadDoc } from './catalog.js';
import { texToText } from './plaintext.js';

const norm = (value) => String(value || '').toLowerCase().replace(/ё/g, 'е');
const KIND_BONUS = { lecture: 6, section: 3, quiz: 1, question: 2, material: 2 };

let cached = null;

export function invalidateIndex() { cached = null; }

export async function buildIndex({ onProgress } = {}) {
  if (cached) return cached;
  const entries = [];
  const docs = allDocs();
  let done = 0;
  await Promise.all(docs.map(async (entry) => {
    let doc;
    try { doc = await loadDoc(entry); } catch { return; } finally { done += 1; onProgress?.(done, docs.length); }
    const subject = getSubject(entry.subjectId);
    if (entry.type === 'lecture') {
      entries.push({ kind: 'lecture', title: entry.title, context: subject?.title, text: doc.leadText, route: href(entry.route), subject });
      for (const section of doc.sections) {
        if (!section.id) continue;
        entries.push({ kind: 'section', title: section.title, context: entry.title, text: section.text, route: href(entry.route, { s: section.id }), subject });
      }
      for (const q of doc.questions) {
        entries.push({ kind: 'quiz', title: q.titleText, context: `${entry.title} · самопроверка`, text: q.answerText, route: href(entry.route, { s: `h-${q.anchor}` }), subject });
      }
    } else {
      for (const q of doc.questions) {
        entries.push({
          kind: 'question',
          title: `${q.n}. ${q.titleText}`,
          context: `${subject?.short || ''} · ${entry.title}`,
          text: [q.group, q.promptText, q.answerText].filter(Boolean).join('\n'),
          route: href(routePath('e', entry.subjectId, entry.slug, q.id)),
          subject,
        });
      }
    }
  }));
  for (const material of allMaterials()) {
    entries.push({ kind: 'material', title: material.title, context: getSubject(material.subjectId)?.title, text: `${material.description} ${material.name}`, material, subject: getSubject(material.subjectId) });
  }
  for (const entry of entries) {
    entry.title = texToText(entry.title);
    entry.text = texToText(entry.text);
    entry.nTitle = norm(entry.title);
    entry.nText = norm(entry.text);
  }
  cached = entries;
  return entries;
}

const terms = (query) => norm(query).split(/\s+/).map((t) => t.trim()).filter(Boolean);

export function search(index, query, limit = 80) {
  const words = terms(query);
  if (!words.length) return [];
  const results = [];
  for (const entry of index) {
    let score = 0;
    for (const word of words) {
      const inTitle = wordStart(entry.nTitle, word);
      const inText = inTitle >= 0 ? -1 : wordStart(entry.nText, word);
      if (inTitle < 0 && inText < 0) { score = -1; break; }
      score += inTitle === 0 ? 16 : inTitle > 0 ? 11 : 2;
    }
    if (score > 0) results.push({ entry, score: score + (KIND_BONUS[entry.kind] || 0) });
  }
  results.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'ru'));
  return results.slice(0, limit).map((r) => r.entry);
}

/** Index of the first occurrence of word that starts a word in haystack, or -1. */
function wordStart(haystack, word) {
  let from = 0;
  for (;;) {
    const i = haystack.indexOf(word, from);
    if (i < 0) return -1;
    if (i === 0 || !/[\p{L}\p{N}]/u.test(haystack[i - 1])) return i;
    from = i + 1;
  }
}

function termPattern(words) {
  const escaped = words
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/е/g, '[её]'))
    .sort((a, b) => b.length - a.length);
  return new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join('|')})`, 'giu');
}

/** Escapes text and wraps matches with <mark>. */
export function highlight(text, query) {
  const words = terms(query);
  if (!words.length) return esc(text);
  return String(text ?? '')
    .split(termPattern(words))
    .map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part)))
    .join('');
}

/** A short excerpt around the first match, highlighted. */
export function snippet(text, query, radius = 80) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source) return '';
  const words = terms(query);
  const lower = norm(source);
  let at = -1;
  for (const word of words) {
    const i = wordStart(lower, word);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) return highlight(source.slice(0, radius * 2) + (source.length > radius * 2 ? '…' : ''), query);
  const start = Math.max(0, at - radius);
  const end = Math.min(source.length, at + radius);
  return highlight(`${start > 0 ? '…' : ''}${source.slice(start, end)}${end < source.length ? '…' : ''}`, query);
}
