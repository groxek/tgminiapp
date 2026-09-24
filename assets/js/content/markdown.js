// Markdown → structured documents. Pure module (no DOM): the browser sanitizes the
// produced HTML separately (sanitize.js), tools/*.mjs reuse this for validation.
//
// Conventions (see content/README.md):
// - "# Title" is the document title; the first paragraph after it is the lead.
// - Math: $inline$, $$display$$ (also \( \) and \[ \]).
// - Callouts: "> [!TIP] Optional title", collapsible with "[!NOTE]-" / "[!NOTE]+".
// - Lecture quiz: a "## Вопросы для самопроверки" section; each "### Question" is a card,
//   the text below it is the answer.
// - Exam files (exam*.md): every heading starting with a number ("## 12. …") is a
//   question; unnumbered headings group questions; a leading "> quote" in a question
//   is its condition, the rest is the answer.

import { Marked } from '../../vendor/marked.esm.js';
import { createSlugger, slugify } from './slug.js';

const QUIZ_HEADING = /^(вопросы(\s+для\s+(самопроверки|повторения))?|самопроверка|проверь(те)?\s+себя|quiz|questions|self[-\s]?check)(?![\p{L}\p{N}])/iu;
const NUMBERED = /^\s*(\d{1,4})\s*[.)]\s+([\s\S]+)$/;
const FRONT_MATTER = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/;
const META_COMMENT = /^\s*<!--\s*meta\b([\s\S]*?)-->[ \t]*\n?/i;
const CALLOUT = /^\[!([a-z]+)\]([+-]?)[ \t]*([^\n]*)(?:\n|$)/i;

export const CALLOUTS = {
  note: 'Заметка',
  info: 'Информация',
  tip: 'Совет',
  important: 'Важно',
  warning: 'Внимание',
  caution: 'Осторожно',
  example: 'Пример',
  question: 'Вопрос',
  quote: 'Цитата',
  definition: 'Определение',
  theorem: 'Теорема',
};
const CALLOUT_ALIASES = { danger: 'caution', error: 'caution', success: 'tip', check: 'tip', hint: 'tip', abstract: 'note', summary: 'note', faq: 'question', help: 'question' };

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

function mathHtml(tex, display) {
  const span = `<span class="math" data-display="${display ? 'block' : 'inline'}">${escapeHtml(tex)}</span>`;
  return display ? `<span class="math-block">${span}</span>` : span;
}

const mathBlock = {
  name: 'mathBlock',
  level: 'block',
  start(src) {
    const match = /(?:^|\n) {0,3}(?:\$\$|\\\[)/.exec(src);
    if (!match) return undefined;
    return match.index + (match[0].startsWith('\n') ? 1 : 0);
  },
  tokenizer(src) {
    const match = /^ {0,3}\$\$([\s\S]+?)\$\$[ \t]*(?:\n+|$)/.exec(src)
      || /^ {0,3}\\\[([\s\S]+?)\\\][ \t]*(?:\n+|$)/.exec(src);
    if (match) return { type: 'mathBlock', raw: match[0], text: match[1].trim() };
    return undefined;
  },
  renderer(token) {
    return `<div class="math-block"><span class="math" data-display="block">${escapeHtml(token.text)}</span></div>\n`;
  },
};

const mathInline = {
  name: 'mathInline',
  level: 'inline',
  start(src) {
    const index = src.search(/\$|\\\(/);
    return index < 0 ? undefined : index;
  },
  tokenizer(src) {
    let match = /^\$\$([\s\S]+?)\$\$/.exec(src);
    if (match) return { type: 'mathInline', raw: match[0], text: match[1].trim(), display: true };
    match = /^\\\(([\s\S]+?)\\\)/.exec(src);
    if (match) return { type: 'mathInline', raw: match[0], text: match[1].trim(), display: false };
    // Pandoc rule: no space after the opening $, none before the closing $, no digit after it.
    match = /^\$(?![\s$])((?:\\[\s\S]|[^\\$\n]|\n(?!\n))+?)(?<![\s\\])\$(?!\d)/.exec(src);
    if (match) return { type: 'mathInline', raw: match[0], text: match[1], display: false };
    return undefined;
  },
  renderer(token) {
    return mathHtml(token.text, token.display);
  },
};

export const md = new Marked({ gfm: true, breaks: false });

md.use({
  extensions: [mathBlock, mathInline],
  renderer: {
    heading(token) {
      const inner = this.parser.parseInline(token.tokens);
      const id = token.anchor ? ` id="h-${token.anchor}"` : '';
      return `<h${token.depth}${id}>${inner}</h${token.depth}>\n`;
    },
    code(token) {
      const lang = String(token.lang || '').trim().split(/\s+/)[0].toLowerCase();
      const text = String(token.text || '').replace(/\n$/, '');
      if (lang === 'mermaid') {
        return `<div class="mermaid-block" data-mermaid="${escapeHtml(text)}"><pre class="code-block"><code>${escapeHtml(text)}</code></pre></div>\n`;
      }
      const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
      return `<pre class="code-block"${langAttr}><code>${escapeHtml(text)}</code></pre>\n`;
    },
    table(token) {
      let header = '';
      for (const cell of token.header) header += this.tablecell(cell);
      let body = '';
      for (const row of token.rows) {
        let cells = '';
        for (const cell of row) cells += this.tablecell(cell);
        body += this.tablerow({ text: cells });
      }
      return `<div class="table-wrap"><table>\n<thead>\n${this.tablerow({ text: header })}</thead>\n${body ? `<tbody>${body}</tbody>` : ''}</table></div>\n`;
    },
    blockquote(token) {
      const body = this.parser.parse(token.tokens);
      if (!token.callout) return `<blockquote>\n${body}</blockquote>\n`;
      const { type, title, fold } = token.callout;
      const label = title ? md.parseInline(title) : escapeHtml(CALLOUTS[type]);
      const head = `<span class="callout__icon" aria-hidden="true"></span><span class="callout__label">${label}</span>`;
      if (fold) {
        return `<details class="callout callout--${type}"${fold === '+' ? ' open' : ''}><summary class="callout__title">${head}</summary><div class="callout__body">${body}</div></details>\n`;
      }
      return `<aside class="callout callout--${type}"><div class="callout__title">${head}</div><div class="callout__body">${body}</div></aside>\n`;
    },
  },
});

function markCallouts(tokens) {
  md.walkTokens(tokens, (token) => {
    if (token.type !== 'blockquote' || token.callout) return;
    const first = token.tokens?.[0];
    if (first?.type !== 'paragraph') return;
    const match = CALLOUT.exec(first.text);
    if (!match) return;
    const name = match[1].toLowerCase();
    const type = CALLOUTS[name] ? name : (CALLOUT_ALIASES[name] || 'note');
    token.callout = { type, fold: match[2] || '', title: match[3].trim() };
    const rest = first.text.slice(match[0].length);
    if (rest.trim()) {
      first.text = rest;
      first.raw = rest;
      first.tokens = md.Lexer.lexInline(rest, md.defaults);
    } else {
      token.tokens.shift();
    }
  });
}

/** Plain text of a token list (math keeps its TeX so search still finds it). */
export function tokensText(tokens) {
  let out = '';
  const visit = (list) => {
    for (const token of list || []) {
      switch (token.type) {
        case 'space': case 'hr': case 'html': break;
        case 'br': out += '\n'; break;
        case 'code': case 'codespan': case 'mathBlock': case 'mathInline': out += ` ${token.text} `; break;
        case 'table':
          for (const cell of token.header) { visit(cell.tokens); out += ' '; }
          for (const row of token.rows) for (const cell of row) { visit(cell.tokens); out += ' '; }
          out += '\n';
          break;
        case 'list':
          for (const item of token.items) { visit(item.tokens); out += '\n'; }
          break;
        default:
          if (token.tokens) visit(token.tokens);
          else if (typeof token.text === 'string') out += token.text;
          if (['paragraph', 'heading', 'blockquote'].includes(token.type)) out += '\n';
      }
    }
  };
  visit(tokens);
  return out.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

function parseKeyValues(block) {
  const meta = {};
  for (const line of String(block || '').split('\n')) {
    const match = /^\s*([A-Za-z][\w-]*)\s*:\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2].replace(/^["']|["']$/g, '');
    if (/^(true|false)$/i.test(value)) value = value.toLowerCase() === 'true';
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    meta[match[1].toLowerCase()] = value;
  }
  return meta;
}

function splitMeta(source) {
  let text = String(source ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  let meta = {};
  const front = FRONT_MATTER.exec(text);
  if (front) { meta = parseKeyValues(front[1]); text = text.slice(front[0].length); }
  const comment = META_COMMENT.exec(text);
  if (comment) { meta = { ...meta, ...parseKeyValues(comment[1]) }; text = text.slice(comment[0].length); }
  return { meta, text, hadFrontMatter: Boolean(front) };
}

const isHeading = (token, maxDepth = 6) => token?.type === 'heading' && token.depth <= maxDepth;
const headingText = (token) => tokensText(token.tokens).replace(/\s+/g, ' ').trim();

function countWords(text) {
  const words = String(text).match(/[\p{L}\p{N}]+/gu);
  return words ? words.length : 0;
}

function renderList(list, links) {
  const copy = list.slice();
  copy.links = links;
  return md.parser(copy);
}

/**
 * Parses a Markdown source into a document model.
 * kind: 'lecture' | 'exam'
 */
export function parseMarkdown(source, { kind = 'lecture' } = {}) {
  const { meta, text, hadFrontMatter } = splitMeta(source);
  const tokens = md.lexer(text);
  const { links } = tokens;
  markCallouts(tokens);

  let hasMath = false;
  let hasMermaid = false;
  md.walkTokens(tokens, (token) => {
    if (token.type === 'mathInline' || token.type === 'mathBlock') hasMath = true;
    if (token.type === 'code' && /^mermaid\b/i.test(String(token.lang || '').trim())) hasMermaid = true;
  });

  const slug = createSlugger(48);
  let blocks = tokens.filter((token) => token.type !== 'space');

  let title = meta.title ? String(meta.title) : '';
  const titleIndex = blocks.findIndex((token) => isHeading(token, 1) && token.depth === 1);
  if (titleIndex >= 0) {
    if (!title) title = headingText(blocks[titleIndex]);
    blocks = blocks.filter((_, index) => index !== titleIndex);
  }

  for (const token of blocks) if (token.type === 'heading') token.anchor = slug(headingText(token));

  const doc = {
    kind, meta, title, hadFrontMatter, hasMath, hasMermaid,
    lead: '', leadText: '', html: '', intro: '', toc: [], sections: [], questions: [], groups: [],
    quiz: null, words: 0, minutes: 1, text: '',
  };

  if (kind === 'exam') parseExam(doc, blocks, links);
  else parseLecture(doc, blocks, links);

  doc.words = countWords(doc.text);
  doc.minutes = Math.max(1, Math.round(doc.words / 170));
  return doc;
}

function takeLead(doc, blocks, links) {
  const first = blocks[0];
  if (!first) return blocks;
  if (first.type === 'paragraph') {
    doc.lead = `<p class="lead">${renderInline(first.tokens)}</p>`;
    doc.leadText = tokensText([first]);
    return blocks.slice(1);
  }
  if (first.type === 'blockquote' && !first.callout) {
    doc.lead = `<div class="lead">${renderList(first.tokens, links)}</div>`;
    doc.leadText = tokensText(first.tokens);
    return blocks.slice(1);
  }
  return blocks;
}

function renderInline(inlineTokens) {
  return md.Parser.parseInline(inlineTokens, md.defaults);
}

function parseLecture(doc, blocks, links) {
  let body = takeLead(doc, blocks, links);

  const quizStart = body.findIndex((token) => isHeading(token, 2) && token.depth === 2 && QUIZ_HEADING.test(headingText(token)));
  if (quizStart >= 0) {
    let quizEnd = body.findIndex((token, index) => index > quizStart && isHeading(token, 2));
    if (quizEnd < 0) quizEnd = body.length;
    const section = body.slice(quizStart + 1, quizEnd);
    const heading = body[quizStart];
    doc.quiz = { title: headingText(heading), anchor: heading.anchor };
    const qslug = createSlugger(48);
    let current = null;
    for (const token of section) {
      if (token.type === 'heading' && token.depth <= 3) {
        current = { id: qslug(headingText(token)), anchor: token.anchor, titleHtml: renderInline(token.tokens), titleText: headingText(token), tokens: [] };
        doc.questions.push(current);
      } else if (current) {
        current.tokens.push(token);
      }
    }
    for (const q of doc.questions) {
      q.answerHtml = renderList(q.tokens, links);
      q.answerText = tokensText(q.tokens);
      delete q.tokens;
    }
    body = [...body.slice(0, quizStart), ...body.slice(quizEnd)];
  }

  doc.html = renderList(body, links);

  let section = { id: '', title: '', tokens: [] };
  const sections = [section];
  for (const token of body) {
    if (token.type === 'heading' && token.depth <= 3) {
      doc.toc.push({ id: `h-${token.anchor}`, depth: token.depth, text: headingText(token) });
      section = { id: `h-${token.anchor}`, title: headingText(token), tokens: [] };
      sections.push(section);
    } else {
      section.tokens.push(token);
    }
  }
  doc.sections = sections
    .map((s) => ({ id: s.id, title: s.title, text: tokensText(s.tokens) }))
    .filter((s) => s.title || s.text);
  doc.text = [doc.leadText, ...doc.sections.map((s) => `${s.title}\n${s.text}`), ...doc.questions.map((q) => `${q.titleText}\n${q.answerText}`)]
    .filter(Boolean).join('\n');
}

function parseExam(doc, blocks, links) {
  const intro = [];
  const groups = [];
  const seenIds = new Map();
  let current = null;
  let started = false;

  const finish = () => {
    if (!current) return;
    const [first, ...rest] = current.tokens;
    if (first?.type === 'blockquote' && !first.callout) {
      current.promptHtml = renderList(first.tokens, links);
      current.promptText = tokensText(first.tokens);
      current.tokens = rest;
    }
    current.answerHtml = renderList(current.tokens, links);
    current.answerText = tokensText(current.tokens);
    delete current.tokens;
    current = null;
  };

  for (const token of blocks) {
    if (token.type === 'heading') {
      const textValue = headingText(token);
      const numbered = token.depth >= 2 ? NUMBERED.exec(textValue) : null;
      if (numbered || !current || token.depth <= current.depth) {
        if (numbered) {
          finish();
          started = true;
          groups.length = Math.min(groups.length, token.depth - 1);
          const n = Number(numbered[1]);
          const count = seenIds.get(n) || 0;
          seenIds.set(n, count + 1);
          const rawTitle = token.text.replace(/^\s*\d{1,4}\s*[.)]\s+/, '');
          current = {
            id: count ? `${n}-${count + 1}` : String(n),
            n,
            depth: token.depth,
            anchor: token.anchor,
            titleHtml: md.parseInline(rawTitle),
            titleText: numbered[2].trim(),
            promptHtml: '',
            promptText: '',
            group: groups.filter(Boolean).map((g) => g.title).join(' · '),
            tokens: [],
          };
          doc.questions.push(current);
          continue;
        }
        finish();
        started = true;
        groups.length = Math.min(groups.length, token.depth);
        groups[token.depth - 1] = { title: textValue };
        const label = groups.filter(Boolean).map((g) => g.title).join(' · ');
        if (!doc.groups.some((g) => g.label === label)) doc.groups.push({ label, depth: token.depth, title: textValue, anchor: token.anchor });
        continue;
      }
    }
    if (current) current.tokens.push(token);
    else if (!started) intro.push(token);
  }
  finish();

  const introBlocks = takeLead(doc, intro, links);
  doc.intro = renderList(introBlocks, links);
  doc.text = [doc.leadText, tokensText(introBlocks), ...doc.questions.map((q) => `${q.titleText}\n${q.promptText}\n${q.answerText}`)]
    .filter(Boolean).join('\n');
}

export { slugify };
