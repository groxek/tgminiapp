#!/usr/bin/env node
// Local dev server: serves the repository and generates content/manifest.json on the fly,
// exactly like GitHub Pages (Jekyll) does on deploy. No dependencies.
//
//   node tools/serve.mjs            → http://localhost:4173/
//   node tools/serve.mjs 3000       → custom port (busy/reserved ports are skipped)
//   HOST=0.0.0.0 node tools/serve.mjs   → reachable from a phone in the same Wi‑Fi

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.pdf': 'application/pdf',
  '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain; charset=utf-8', '.map': 'application/json',
};

const hidden = (name) => name.startsWith('_') || name.startsWith('.');

/** Mirrors content/manifest.json as Jekyll renders it. */
async function manifest() {
  const files = [];
  const pages = [];
  async function walk(dir, rel) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (hidden(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const relPath = `${rel}/${entry.name}`;
      if (entry.isDirectory()) { await walk(full, relPath); continue; }
      if (relPath === '/content/manifest.json') continue;
      if (/\.md$/i.test(entry.name)) {
        const head = (await fs.readFile(full, 'utf8')).slice(0, 4);
        if (head.startsWith('---')) { pages.push(relPath.slice(1)); continue; }
      }
      files.push(relPath);
    }
  }
  await walk(CONTENT, '/content');
  files.sort();
  return JSON.stringify({ generator: 'dev-server', built: new Date().toISOString(), files, pages }, null, 2);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/content/manifest.json') {
      res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-cache' });
      res.end(await manifest());
      return;
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(ROOT, `.${pathname}`);
    if (!file.startsWith(ROOT + path.sep) || pathname.split('/').some((p) => p.startsWith('.') && p !== '.')) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch (err) {
    res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(err.code === 'ENOENT' ? 'Not found' : String(err));
  }
});

// Windows reserves port ranges (EACCES) and a port may be busy (EADDRINUSE): try the next ones.
let port = PORT;
server.on('error', (err) => {
  if ((err.code === 'EACCES' || err.code === 'EADDRINUSE') && port < PORT + 20) {
    port += 1;
    server.listen(port, HOST);
    return;
  }
  console.error(`Не удалось запустить сервер: ${err.message}`);
  process.exit(1);
});
server.on('listening', () => {
  console.log(`Конспекты: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${port}/  (Ctrl+C — остановить)`);
});
server.listen(port, HOST);
