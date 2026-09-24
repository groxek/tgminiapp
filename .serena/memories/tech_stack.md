# Tech stack

- Ванильные HTML/CSS/ES-модули, без фреймворка, бандлера и транспиляции.
- Вшито: marked 18.0.14 (`assets/vendor/marked.esm.js`, MIT).
- CDN, грузятся лениво:
  - MathJax 4.1.3 `tex-chtml.js` (jsDelivr) — только если на экране есть формулы;
  - Mermaid 12.0.0 ESM — только при наличии ```` ```mermaid ````;
  - Telegram SDK `telegram-web-app.js?63` — всегда.
- Используемые API браузера: View Transitions (с запасной CSS-анимацией), IntersectionObserver, `color-mix()` (с `@supports`-фолбэком для основной кнопки), `requestIdleCallback`.
- Хостинг: GitHub Pages + Jekyll (github-pages, Jekyll 3.10). Резервный путь для списка файлов — GitHub tree API (`catalog.fromGitHub`, только `*.github.io`, ETag в `konsp-tree-v1`).
- localStorage: `konsp-v3` (состояние), `konsp-meta-v1` (кэш метаданных документов с fingerprint), `konsp-tree-v1`. Старые ключи `konsp-mini-v2`/`v1` не удаляются: из них мигрируют.
- Serena: LSP `typescript` обслуживает `.js`/`.mjs`; CSS, HTML и Markdown — через Grep/Read.
- Node нужен только для `tools/` (≥18); на машине стоит v26 (в bash его нет в PATH, см. `mem:suggested_commands`).
