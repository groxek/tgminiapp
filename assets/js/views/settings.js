import { html } from '../core/dom.js';
import { enhance } from '../content/render.js';
import { exportData, getState, importData, prefs, resetProgress, setPref } from '../core/store.js';
import { confirmDialog, haptic, inTelegram } from '../core/telegram.js';
import { FONTS, PALETTES, applyAppearance, previewSwatch, resolvedScheme } from '../core/theme.js';
import { getCatalog, loadCatalog } from '../content/catalog.js';
import { invalidateIndex } from '../content/search.js';
import { local } from '../core/storage.js';
import { APP_VERSION } from '../config.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

function segmented(name, options, value) {
  return html`<div class="segmented segmented--inline" role="radiogroup">
    ${options.map(([id, label]) => html`<button type="button" class="segmented__item ${value === id ? 'is-active' : ''}" data-action="pref" data-name="${name}" data-value="${id}" role="radio" aria-checked="${value === id}">${label}</button>`)}
  </div>`;
}

function toggle(name, value, label, hint = '') {
  return html`<label class="toggle-row">
    <span><strong>${label}</strong>${hint ? html`<small>${hint}</small>` : ''}</span>
    <input type="checkbox" class="switch" data-role="toggle" data-name="${name}" ${value ? 'checked' : ''}>
  </label>`;
}

function swatch(id, name, active) {
  const colors = previewSwatch(id, resolvedScheme());
  return html`<button type="button" class="swatch ${active ? 'is-active' : ''}" data-action="pref" data-name="palette" data-value="${id}" aria-pressed="${active}" style="--sw-bg:${colors.bg};--sw-a:${colors.accent};--sw-b:${colors.accent2}">
    <span class="swatch__chip" aria-hidden="true"><i></i></span><span class="swatch__name">${name}</span>
  </button>`;
}

export default {
  tab: 'settings',
  needsCatalog: false,
  chrome: () => ({ title: 'Настройки', crumb: 'Оформление и данные', back: false }),

  render() {
    const p = prefs();
    const catalog = getCatalog();
    const state = getState();
    const cards = Object.keys(state.cards).length;
    const read = Object.values(state.reading).filter((r) => r.done).length;
    return html`<div class="page page--settings">
      <section class="settings-card glass">
        <h2>${icon('palette', { size: 20 })}Оформление</h2>
        <div class="field"><span class="field__label">Палитра</span>
          <div class="swatches">
            ${swatch('auto', inTelegram ? 'Telegram' : 'Авто', p.palette === 'auto')}
            ${PALETTES.map((pal) => swatch(pal.id, pal.name, p.palette === pal.id))}
          </div>
        </div>
        <div class="field"><span class="field__label">Тема</span>${segmented('scheme', [['auto', 'Авто'], ['light', 'Светлая'], ['dark', 'Тёмная']], p.scheme)}</div>
      </section>

      <section class="settings-card glass">
        <h2>${icon('book', { size: 20 })}Чтение</h2>
        <div class="field"><span class="field__label">Шрифт текста</span>
          <div class="font-grid">${FONTS.map((f) => html`<button type="button" class="font-option ${p.font === f.id ? 'is-active' : ''}" data-action="pref" data-name="font" data-value="${f.id}" style="font-family:${f.stack}"><b>Аа</b><span>${f.name}</span></button>`)}</div>
        </div>
        <div class="field">
          <span class="field__label">Размер текста <output data-role="out-fontSize">${p.fontSize}px</output></span>
          <input type="range" class="range" min="14" max="24" step="1" value="${p.fontSize}" data-role="range" data-name="fontSize" aria-label="Размер текста">
        </div>
        <div class="field">
          <span class="field__label">Межстрочный интервал <output data-role="out-lineHeight">${p.lineHeight.toFixed(2)}</output></span>
          <input type="range" class="range" min="1.35" max="2.1" step="0.05" value="${p.lineHeight}" data-role="range" data-name="lineHeight" aria-label="Межстрочный интервал">
        </div>
        <div class="field"><span class="field__label">Ширина колонки</span>${segmented('width', [['narrow', 'Узкая'], ['normal', 'Обычная'], ['wide', 'Широкая']], p.width)}</div>
        <div class="reading-preview prose">
          <p>Предел последовательности — число <span class="math" data-display="inline">a</span>, к которому члены <span class="math" data-display="inline">x_n</span> приближаются сколь угодно близко. Так будет выглядеть текст лекций.</p>
        </div>
      </section>

      <section class="settings-card glass">
        <h2>${icon('hand', { size: 20 })}Поведение</h2>
        <div class="field"><span class="field__label">Анимации</span>${segmented('motion', [['auto', 'Как в системе'], ['full', 'Полные'], ['reduced', 'Минимум']], p.motion)}</div>
        ${toggle('haptics', p.haptics, 'Вибрация', inTelegram ? 'Тактильный отклик Telegram на действия' : 'Работает внутри Telegram')}
        ${toggle('focusFullscreen', p.focusFullscreen, 'Фокус на весь экран', 'В Telegram на телефоне режим фокуса разворачивает приложение')}
      </section>

      <section class="settings-card glass">
        <h2>${icon('download', { size: 20 })}Данные</h2>
        <p class="settings-note">Прогресс хранится на этом устройстве: ${read} прочитанных лекций, ${cards} отмеченных вопросов. Перенесите его на другое устройство экспортом.</p>
        <div class="btn-row">
          <button type="button" class="btn btn--glass btn--sm" data-action="export">${icon('download', { size: 16 })}<span>Экспорт</span></button>
          <label class="btn btn--glass btn--sm">${icon('upload', { size: 16 })}<span>Импорт</span><input type="file" accept="application/json,.json" data-role="import" hidden></label>
          <button type="button" class="btn btn--glass btn--sm" data-action="refresh-content">${icon('repeat', { size: 16 })}<span>Обновить материалы</span></button>
          <button type="button" class="btn btn--danger-ghost btn--sm" data-action="reset">${icon('trash', { size: 16 })}<span>Сбросить прогресс</span></button>
        </div>
      </section>

      <section class="settings-card settings-card--about glass">
        <h2>${icon('info', { size: 20 })}О приложении</h2>
        <dl class="about">
          <dt>Версия</dt><dd>${APP_VERSION}</dd>
          <dt>Каталог</dt><dd>${catalog ? `${catalog.subjects.length} предметов · ${catalog.source === 'github' ? 'GitHub API' : 'манифест сайта'}` : 'не загружен'}</dd>
          ${catalog?.builtAt ? html`<dt>Сборка</dt><dd>${new Date(catalog.builtAt).toLocaleString('ru-RU')}</dd>` : ''}
          ${state.migratedFrom ? html`<dt>Миграция</dt><dd>прогресс перенесён из ${state.migratedFrom}</dd>` : ''}
        </dl>
        ${catalog?.warnings?.length ? html`<ul class="warnings">${catalog.warnings.map((w) => html`<li>${w}</li>`)}</ul>` : ''}
        <p class="settings-note">Лекции — это Markdown-файлы в папке <code>content/</code> репозитория. Новый файл появляется в приложении после публикации, без изменения кода.</p>
      </section>
    </div>`;
  },

  mount(root, ctx) {
    const onInput = (event) => {
      const el = event.target;
      if (el.dataset.role === 'range') {
        const value = Number(el.value);
        setPref(el.dataset.name, value);
        applyAppearance();
        const out = root.querySelector(`[data-role="out-${el.dataset.name}"]`);
        if (out) out.textContent = el.dataset.name === 'fontSize' ? `${value}px` : value.toFixed(2);
      }
    };
    const onChange = async (event) => {
      const el = event.target;
      if (el.dataset.role === 'toggle') {
        setPref(el.dataset.name, el.checked);
        haptic.select();
      } else if (el.dataset.role === 'range') {
        haptic.select();
      } else if (el.dataset.role === 'import' && el.files?.[0]) {
        try {
          importData(await el.files[0].text());
          applyAppearance();
          toast('Прогресс импортирован');
          ctx.refresh();
        } catch (err) {
          toast(`Не удалось импортировать: ${err.message}`);
        }
      }
    };
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    const stopMath = enhance(root);
    return () => {
      stopMath();
      root.removeEventListener('input', onInput);
      root.removeEventListener('change', onChange);
    };
  },

  actions: {
    pref(el, event, ctx) {
      setPref(el.dataset.name, el.dataset.value);
      applyAppearance();
      haptic.select();
      ctx.refresh();
    },
    async export() {
      const data = exportData();
      try {
        await navigator.clipboard.writeText(data);
        toast('Прогресс скопирован в буфер обмена');
      } catch {
        const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: `konspekty-progress-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast('Файл прогресса сохранён');
      }
    },
    async reset(el, event, ctx) {
      if (!(await confirmDialog('Сбросить весь прогресс: прочитанные лекции и статусы вопросов? Настройки оформления сохранятся.'))) return;
      resetProgress();
      haptic.notify('warning');
      toast('Прогресс сброшен');
      ctx.refresh();
    },
    async 'refresh-content'(el, event, ctx) {
      local.remove('konsp-meta-v1');
      local.remove('konsp-tree-v1');
      invalidateIndex();
      try {
        await loadCatalog({ force: true });
        toast('Материалы обновлены');
      } catch (err) {
        toast(`Ошибка: ${err.message}`);
      }
      ctx.refresh();
    },
  },
};

