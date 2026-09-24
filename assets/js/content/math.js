// MathJax 4 is loaded only when a screen actually contains formulas, then formulas are
// typeset lazily as they approach the viewport. Until then (or if the CDN is unreachable)
// the raw TeX stays visible in a styled, horizontally scrollable fallback.

const MATHJAX_SRC = 'https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-chtml.js';
const LOAD_TIMEOUT = 15000;

const RETRY_AFTER = 60000;

let loading = null;
let failedAt = 0;
const recentlyFailed = () => Date.now() - failedAt < RETRY_AFTER;
const queue = new Set();
let flushing = false;

function configure() {
  window.MathJax = {
    // Defaults are exactly what render() writes: \( … \) inline and \[ … \] display.
    tex: { processEscapes: false },
    output: {
      displayOverflow: 'linebreak',
      linebreaks: { inline: true, width: '100%' },
      mtextInheritFont: true,
    },
    // No context menu, no speech/Braille workers (heavy on phones); screen readers still
    // get hidden MathML via assistiveMml.
    options: {
      enableMenu: false,
      enableExplorer: false,
      enableSpeech: false,
      enableBraille: false,
      enableEnrichment: false,
      menuOptions: { settings: { enrich: false, speech: false, braille: false, collapsible: false, assistiveMml: true } },
    },
    startup: { typeset: false },
  };
}

export function loadMathJax() {
  if (window.MathJax?.typesetPromise) return Promise.resolve(window.MathJax);
  if (loading) return loading;
  configure();
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => reject(new Error('MathJax timeout')), LOAD_TIMEOUT);
    script.src = MATHJAX_SRC;
    script.async = true;
    script.onload = () => {
      const ready = window.MathJax?.startup?.promise || Promise.resolve();
      ready.then(() => { clearTimeout(timer); resolve(window.MathJax); }, (err) => { clearTimeout(timer); reject(err); });
    };
    script.onerror = () => { clearTimeout(timer); reject(new Error('MathJax failed to load')); };
    document.head.appendChild(script);
  }).catch((err) => {
    failedAt = Date.now();
    loading = null;
    throw err;
  });
  return loading;
}

function markFallback(nodes) {
  for (const el of nodes) {
    el.textContent = el.dataset.tex ?? el.textContent;
    el.classList.remove('math--pending');
    el.classList.add('math--fallback');
  }
}

async function flush() {
  if (flushing || !queue.size) return;
  flushing = true;
  const batch = Array.from(queue).filter((el) => el.isConnected);
  queue.clear();
  try {
    const MathJax = await loadMathJax();
    for (const el of batch) {
      const tex = el.dataset.tex ?? el.textContent;
      el.dataset.tex = tex;
      el.textContent = el.dataset.display === 'block' ? `\\[${tex}\\]` : `\\(${tex}\\)`;
    }
    await MathJax.typesetPromise(batch);
    for (const el of batch) {
      el.classList.remove('math--pending', 'math--fallback');
      el.classList.add('math--done');
    }
  } catch {
    markFallback(batch);
  } finally {
    flushing = false;
    if (queue.size) flush();
  }
}

/**
 * Starts lazy typesetting of every `.math` element inside root.
 * Returns a cleanup function (disconnects observers, releases MathJax state).
 */
export function typesetWithin(root) {
  const nodes = Array.from(root.querySelectorAll('.math:not(.math--done):not(.math--pending)'));
  if (!nodes.length) return () => {};
  for (const el of nodes) {
    el.dataset.tex = el.textContent;
    el.classList.add('math--pending');
  }
  if (recentlyFailed()) { markFallback(nodes); return () => {}; }
  loadMathJax().catch(() => markFallback(Array.from(root.querySelectorAll('.math--pending'))));

  if (!('IntersectionObserver' in window)) {
    nodes.forEach((el) => queue.add(el));
    flush();
    return () => {};
  }
  const observer = new IntersectionObserver((entries) => {
    let added = false;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      queue.add(entry.target);
      added = true;
    }
    if (added) flush();
  }, { rootMargin: '900px 0px 900px 0px' });
  nodes.forEach((el) => observer.observe(el));
  return () => {
    observer.disconnect();
    try { window.MathJax?.typesetClear?.([root]); } catch { /* ignore */ }
  };
}
