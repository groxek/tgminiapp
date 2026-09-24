# Suggested commands (Windows)

- Node: в PowerShell доступен; в bash — `export PATH="/c/nvm4w/nodejs:$PATH"`.
- Dev-сервер: `node tools/serve.mjs` (или `npm run dev`) → http://127.0.0.1:4173/. Занятые и зарезервированные порты пропускает сам. Порт 8080 из песочницы агента давал EACCES. Запускать в фоне (`run_in_background`).
- Проверка контента: `node tools/check-content.mjs` (`npm run check`), при ошибках код выхода 1.
- Синтаксис JS: `node --check <file>` для всех файлов `assets/js` и `tools`.
- QA-хук: `?qa` в URL → `window.__KONSP_QA__ = { state(), route(), catalog(), go(hash), render() }`.
- Браузерные e2e: playwright-core + установленный Edge (`chromium.launch({ channel: 'msedge' })`). Ставить в scratchpad, не в репозиторий.
- `python -m http.server` не годится: он отдаёт сырой Liquid-манифест (приложение тогда уйдёт в GitHub API и покажет удалённый контент).
