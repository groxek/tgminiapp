// Mermaid diagrams (```mermaid blocks) — the library is imported only when needed.

const MERMAID_SRC = 'https://cdn.jsdelivr.net/npm/mermaid@12.0.0/dist/mermaid.esm.min.mjs';

let modulePromise = null;
let counter = 0;

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

async function getMermaid() {
  if (!modulePromise) {
    modulePromise = import(/* @vite-ignore */ MERMAID_SRC).then((mod) => mod.default).catch((err) => {
      modulePromise = null;
      throw err;
    });
  }
  return modulePromise;
}

function themeVariables() {
  const dark = document.documentElement.dataset.scheme !== 'light';
  return {
    darkMode: dark,
    background: 'transparent',
    fontFamily: cssVar('--font-ui', 'system-ui, sans-serif'),
    fontSize: '15px',
    primaryColor: cssVar('--surface-2', dark ? '#1b1a2e' : '#ffffff'),
    primaryTextColor: cssVar('--text', dark ? '#f3f2fb' : '#16141f'),
    primaryBorderColor: cssVar('--accent', '#8b7bff'),
    lineColor: cssVar('--text-3', '#8886a3'),
    secondaryColor: cssVar('--surface', '#15142a'),
    tertiaryColor: cssVar('--surface', '#15142a'),
    edgeLabelBackground: cssVar('--bg', dark ? '#08070f' : '#f6f4ff'),
  };
}

export async function renderDiagramsWithin(root) {
  const blocks = Array.from(root.querySelectorAll('.mermaid-block:not([data-state])'));
  if (!blocks.length) return;
  blocks.forEach((block) => { block.dataset.state = 'pending'; });
  let mermaid;
  try {
    mermaid = await getMermaid();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: themeVariables(),
      flowchart: { curve: 'basis', htmlLabels: false, useMaxWidth: true },
    });
  } catch {
    blocks.forEach((block) => { block.dataset.state = 'error'; });
    return;
  }
  for (const block of blocks) {
    if (!block.isConnected) continue;
    try {
      counter += 1;
      const { svg } = await mermaid.render(`mmd-${Date.now().toString(36)}-${counter}`, block.dataset.mermaid || '');
      block.innerHTML = `<div class="mermaid-svg">${svg}</div>`;
      block.dataset.state = 'done';
    } catch {
      block.dataset.state = 'error';
    }
  }
}
