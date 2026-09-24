#!/usr/bin/env node
// Validates everything in content/ the way the app will read it.
//   node tools/check-content.mjs          → report, exit code 1 on errors
// Uses the app's own Markdown module, so what passes here renders in the app.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarkdown } from '../assets/js/content/markdown.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const RESERVED = /^(readme|index|license|contributing)\.md$/i;
const EXAM_FILE = /^exam(?:[-_.][^/]*)?\.md$/i;

const errors = [];
const warnings = [];
let lectures = 0;
let exams = 0;
let questions = 0;

function walk(dir, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), relPath));
    else out.push(relPath);
  }
  return out;
}

function checkMath(file, text) {
  const withoutCode = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' ')).replace(/`[^`\n]*`/g, '');
  const blocks = (withoutCode.match(/^\s{0,3}\$\$\s*$/gm) || []).length;
  if (blocks % 2) warnings.push(`${file}: непарное число строк "$$" (${blocks})`);
  withoutCode.split('\n').forEach((line, i) => {
    if (!/^\s*\|.*\|\s*$/.test(line)) return;
    // Marked splits table cells on unescaped "|" before it sees formulas.
    const cells = line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/);
    if (cells.some((cell) => (cell.replace(/\\\$/g, '').match(/\$/g) || []).length % 2)) {
      warnings.push(`${file}:${i + 1}: формула в таблице разрезана символом | — используйте \\lvert … \\rvert, \\mid или \\|`);
    }
  });
}

function checkLinks(file, text, known) {
  const base = path.posix.dirname(file);
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1];
    if (/^[a-z][a-z0-9+.-]*:|^#|^\/\//i.test(target)) continue;
    let decoded = target.split('#')[0];
    try { decoded = decodeURIComponent(decoded); } catch { /* keep */ }
    const resolved = path.posix.normalize(path.posix.join(base, decoded));
    if (!known.has(resolved)) warnings.push(`${file}: ссылка ведёт на несуществующий файл ${target}`);
  }
}

const files = walk(CONTENT);
const known = new Set(files);
const subjects = new Set();

for (const file of files) {
  const parts = file.split('/');
  const name = parts[parts.length - 1];
  if (parts.length === 1) continue;
  subjects.add(parts[0]);
  if (/^subject\.json$/i.test(name) && parts.length === 2) {
    try { JSON.parse(fs.readFileSync(path.join(CONTENT, file), 'utf8')); } catch (err) { errors.push(`${file}: неверный JSON — ${err.message}`); }
    continue;
  }
  if (!/\.md$/i.test(name) || RESERVED.test(name) || /^materials$/i.test(parts[1] || '')) continue;
  const text = fs.readFileSync(path.join(CONTENT, file), 'utf8');
  if (/^﻿?---/.test(text)) {
    errors.push(`${file}: файл начинается с "---" (YAML front matter). GitHub Pages не опубликует его как Markdown — используйте комментарий <!-- meta ... -->`);
    continue;
  }
  const kind = parts.length === 2 && EXAM_FILE.test(name) ? 'exam' : 'lecture';
  let doc;
  try {
    doc = parseMarkdown(text, { kind });
  } catch (err) {
    errors.push(`${file}: не разбирается — ${err.message}`);
    continue;
  }
  if (!doc.title) warnings.push(`${file}: нет заголовка "# Название" — будет взято имя файла`);
  if (kind === 'exam') {
    exams += 1;
    questions += doc.questions.length;
    if (!doc.questions.length) warnings.push(`${file}: не найдено ни одного вопроса (нужны заголовки вида "## 1. Текст вопроса")`);
    const dups = doc.questions.filter((q) => q.id.includes('-')).map((q) => q.n);
    if (dups.length) warnings.push(`${file}: повторяются номера вопросов ${[...new Set(dups)].join(', ')}`);
    const empty = doc.questions.filter((q) => !q.answerText.trim()).map((q) => q.n);
    if (empty.length) warnings.push(`${file}: без ответа ${empty.length} вопросов (${empty.slice(0, 12).join(', ')}${empty.length > 12 ? '…' : ''})`);
  } else {
    lectures += 1;
    questions += doc.questions.length;
  }
  checkMath(file, text);
  checkLinks(file, text, known);
}

console.log(`Предметов: ${subjects.size}, лекций: ${lectures}, файлов с вопросами: ${exams}, вопросов всего: ${questions}`);
for (const w of warnings) console.log(`  ⚠ ${w}`);
for (const e of errors) console.log(`  ✖ ${e}`);
if (!warnings.length && !errors.length) console.log('  ✓ Замечаний нет');
process.exitCode = errors.length ? 1 : 0;
