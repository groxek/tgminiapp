# Conventions

## Код
- ES-модули без сборки, относительные импорты с `.js`. 2 пробела, одинарные кавычки, `;`, короткие функции. Комментарии — только для неочевидного.
- Экран = объект по умолчанию в `views/*.js`: `{ tab, skeleton?, needsCatalog?, load(ctx) → data, chrome(ctx, data) → {title, crumb, back, actions}, render(ctx, data) → html, mount(root, ctx, data) → cleanup, actions: { name(el, event, ctx, data) }, keys: { key(ctx, data) }, onChange(type) → bool }`.
- `app.js` сам выбирает экран по `route.name`, показывает скелетон через 140 мс, вызывает `ctx.refresh()` для перерисовки без анимации и дёргает `onChange` на события store (`card`, `reading`, `import`, `reset`) и catalog (`entry`, `prefetched`).
- Навигация — настоящие `<a href="#/…">` через `href(path(...))`. Действия — `data-action` (сначала обработчики экрана, затем `GLOBAL_ACTIONS`: `back`, `retry`, `cycle-status`, `copy-code`). Тактильный отклик ссылки — `data-haptic="light|medium|select|none"`.
- Разметка — только тегом `html`` `: значения экранируются, `raw()` — для уже санитизированного HTML.

## HTML из Markdown
- Любой HTML документа проходит `render.prepare(html, entry)`: allowlist-санитизация, переписывание ссылок (`.md` → маршрут, якоря → `?s=h-<slug>`, внешние и файлы → `data-external`/`data-file` → `openLink`), пути картинок относительно файла, кнопка копирования кода. После монтирования — `render.enhance(root)` (MathJax + Mermaid), возвращаемый cleanup обязателен.
- id заголовков: `h-<translit-slug>` (префикс защищает id приложения).

## Формулы
- MathJax 4 грузится с CDN только при наличии `.math`. Типсет ленивый (IntersectionObserver, отступ 900px). Длинные формулы переносятся (`displayOverflow: linebreak`), что не влезло, прокручивается внутри `.math-block`. Речь, Брайль и обогащение выключены. Если CDN недоступен — `.math--fallback` с TeX, повторная попытка через 60 с.

## Telegram (`core/telegram.js`)
- `tg` существует и в обычном браузере; реальный режим — `inTelegram` (`platform !== 'unknown'`). Любой вызов идёт через проверку версии `atLeast(...)` и `try`.
- BackButton сначала выходит из фокус-режима, потом `history.back()` или `chrome.back`. SettingsButton ведёт в `#/settings`. `disableVerticalSwipes`, safe areas → `--tg-safe-*`, цвет шапки/фона/нижней панели = `--bg`.

## Тема и CSS
- Цвета — только CSS-переменные из `theme.applyAppearance()` (`--bg`, `--surface`, `--text*`, `--accent*` + `*-rgb` для альфы). Палитра `auto` = Telegram `themeParams`, вне Telegram — violet. Цвет предмета — `.accent-<id>` → `--sa`, `--sa-2`.
- Слои CSS: `tokens → base → layout → components → reader → quiz`. Стекло (`.glass`) без `backdrop-filter`; blur есть только у topbar, tabbar, toast и focus-exit (ради производительности).
- Движение уважает `data-motion="reduced"` (системная настройка или настройки приложения). Hover — только под `@media (hover: hover)`.
- Весь UI-текст на русском.
