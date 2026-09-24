// Stable, readable ASCII slugs (Cyrillic is transliterated). Pure: also used by tools/*.mjs.

const CYRILLIC = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function slugify(text, max = 64) {
  const ascii = Array.from(String(text ?? '').toLowerCase(), (ch) => CYRILLIC[ch] ?? ch).join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii.slice(0, max).replace(/-+$/, '') || 'item';
}

/** Returns a slug function that de-duplicates within one document: a, a-2, a-3… */
export function createSlugger(max = 64) {
  const seen = new Map();
  return (text) => {
    const base = slugify(text, max);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count ? `${base}-${count + 1}` : base;
  };
}

/** "01-introduction.md" → { order: 1, slug: "introduction" } */
export function parseFileName(name) {
  const base = String(name).replace(/\.[^.]+$/, '');
  const match = /^(\d{1,4})[-_. ]+(.+)$/.exec(base);
  return match ? { order: Number(match[1]), slug: match[2] } : { order: null, slug: base };
}

/** "linear-algebra" → "Linear algebra", "Физика" stays as is. */
export function humanize(value) {
  const text = String(value ?? '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}
