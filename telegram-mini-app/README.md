# Конспекты — Telegram Mini App

Статический Mini App на чистом HTML/CSS/JS. Данные лекций взяты из исходного HTML.

## Что внутри

- предметы → лекции → чтение → квиз;
- поиск;
- 13+ тем;
- 5 шрифтов без внешних font-файлов;
- размер текста;
- прогресс в `localStorage`;
- Telegram BackButton / theme color / fullscreen expand.

## Запуск

Нужен HTTPS-хостинг. Самый простой путь — GitHub Pages.

1. Создай репозиторий на GitHub.
2. Загрузи сюда все файлы из этой папки.
3. Settings → Pages → Deploy from branch → `main` → `/ (root)` → Save.
4. Получишь URL вида `https://USERNAME.github.io/REPO/`.
5. В @BotFather открой своего бота → Bot Settings → Menu Button → Configure Menu Button.
6. Текст кнопки: `📚 Конспекты`.
7. URL: адрес GitHub Pages.
8. В Telegram открой бота и нажми кнопку меню.

Для полноценного Mini App Telegram ожидает HTTPS URL. Также можно назначить его как Main Mini App через @BotFather.
