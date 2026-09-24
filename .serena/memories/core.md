# tgminiapp — core

Telegram Mini App «Конспекты» v8: лекции и вопросы к экзаменам — Markdown-файлы в `content/`, приложение — статический сайт на GitHub Pages. Без сборки и npm-зависимостей (`package.json` — только scripts и `"type": "module"`). Прежняя версия (v7: `app.js`/`data.js`/`styles.css` в корне) удалена, она есть в истории git.

## Деплой
- GitHub Pages «Deploy from a branch», корень. **Jekyll обязателен** (не добавлять `.nojekyll`): он рендерит `content/manifest.json` — Liquid-список `site.static_files` под `/content/`. Так новая лекция публикуется без правки кода.
- `_config.yml` оставляет `.md` сырыми (`require_front_matter: true`, `optional_front_matter.enabled: false`, `readme_index.enabled: false`). Файл, начинающийся с `---`, Jekyll превратит в HTML, и приложение его не увидит.
- `main` = прод (push = деплой). Перестройка делалась в ветке `redesign/markdown-v8`.

## Карта исходников
- `index.html` — оболочка: sidebar (≥1024px), topbar (`#backBtn`, `#crumb`, `#screenTitle`, `#topActions`), `#readingProgress`, `#screen`, `#tabbar`, `#toast`. Подключает Telegram SDK, 6 CSS-файлов, modulepreload и `assets/js/main.js` (type=module).
- `assets/js/app.js` — роутинг экранов, chrome, View Transitions, делегирование `[data-action]` и клавиш, BackButton, sidebar, фоновый `prefetchAll`, редиректы старых ссылок v7.
- `core/`: `dom` (тег `html`` ` с автоэкранированием, `raw()`), `router` (hash-маршруты; направление перехода через `history.state.idx`), `store` (localStorage `konsp-v3` + миграция из v1/v2), `legacy` (карты старых id), `telegram`, `theme`, `storage`.
- `content/`: `catalog`, `markdown` (чистый, без DOM), `sanitize`, `render`, `math`, `diagrams`, `search`, `plaintext`, `slug`.
- `quiz/engine.js` — чистые функции над сериализуемой сессией. `ui/` — icons, components, toast, focus. `views/` — по модулю на экран.
- `assets/vendor/marked.esm.js` — вшитый marked 18, не редактировать.
- `tools/serve.mjs` — dev-сервер, генерирует манифест как Jekyll. `tools/check-content.mjs` — валидатор контента парсером приложения, CI: `.github/workflows/content-check.yml`.

## Маршруты (`core/router.js`)
`#/`, `#/s/<subject>[/lectures|exam|files]`, `#/l/<subject>/<lectureSlug>[?s=<anchor>|resume=1]`, `#/e/<subject>/<examSlug>[/<qid>]`, `#/q/<l|e>/<subject>/<target>[?mode=all|unknown|random&n=10]`, `#/q/s/<subject>`, `#/session`, `#/materials`, `#/search[?q=]`, `#/settings`. Сегменты кодируются `path()`, так что `/` внутри slug становится `%2F`.

## Далее
- Формат контента, ключи прогресса и что нельзя переименовывать: `mem:data_model`.
- Контракт экранов, экранирование и санитизация, темы, Telegram, MathJax: `mem:conventions`.
- Внешние зависимости и версии: `mem:tech_stack`.
- Запуск, QA-хук, особенности Windows: `mem:suggested_commands`.
- Проверки перед сдачей: `mem:task_completion`.
