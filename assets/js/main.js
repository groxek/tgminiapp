import { start } from './app.js';

try {
  start();
} catch (error) {
  console.error(error);
  const screen = document.getElementById('screen');
  if (screen) screen.innerHTML = '<div class="boot-error"><h1>Не удалось запустить приложение</h1><p>Обновите страницу. Если ошибка повторяется — сообщите автору.</p></div>';
}
