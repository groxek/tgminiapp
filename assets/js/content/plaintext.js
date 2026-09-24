// Readable plain text from TeX (search snippets, summaries): \frac{a}{b} → a/b, \le → ≤ …

const SYMBOLS = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ',
  vartheta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ',
  Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  infty: '∞', pm: '±', mp: '∓', cdot: '·', times: '×', div: '÷', le: '≤', leq: '≤', ge: '≥', geq: '≥',
  ne: '≠', neq: '≠', approx: '≈', equiv: '≡', sim: '~', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆',
  supset: '⊃', cup: '∪', cap: '∩', setminus: '∖', emptyset: '∅', varnothing: '∅', forall: '∀', exists: '∃',
  to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', iff: '⇔', Leftrightarrow: '⇔',
  leftrightarrow: '↔', mapsto: '↦', land: '∧', wedge: '∧', lor: '∨', vee: '∨', neg: '¬', lnot: '¬',
  oplus: '⊕', otimes: '⊗', partial: '∂', nabla: '∇', sum: 'Σ', prod: 'Π', int: '∫', iint: '∬', oint: '∮',
  ldots: '…', dots: '…', cdots: '⋯', vdots: '⋮', mid: '|', lvert: '|', rvert: '|', vert: '|', Vert: '‖',
  langle: '⟨', rangle: '⟩', circ: '∘', perp: '⊥', parallel: '∥', angle: '∠', triangle: '△', degree: '°',
  uparrow: '↑', downarrow: '↓', prime: '′', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', ell: 'ℓ',
};
const BLACKBOARD = { R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ' };
const DROP = /\\(?:left|right|big|Big|bigg|Bigg|bigl|bigr|Bigl|Bigr|displaystyle|textstyle|limits|nolimits|quad|qquad)(?![a-zA-Z])/g;

export function texToText(input) {
  let s = String(input ?? '');
  if (!s.includes('\\') && !/[{}^_]/.test(s)) return s;
  s = s
    .replace(/\\\{/g, '\u0001').replace(/\\\}/g, '\u0002')
    .replace(DROP, ' ')
    .replace(/\\(lim|sum|prod|max|min|sup|inf)\s*_\s*\{([^{}]*)\}/g, '$1($2) ');
  for (let i = 0; i < 3; i += 1) {
    s = s
      .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
      .replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, '$1√($2)')
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
      .replace(/\\mathbb\s*\{([A-Z])\}/g, (m, c) => BLACKBOARD[c] || c)
      .replace(/\\(?:text|mathrm|mathbf|mathit|mathsf|operatorname|boldsymbol|overline|underline|vec|bar|hat|widehat|tilde)\s*\{([^{}]*)\}/g, '$1');
  }
  s = s
    .replace(/\\(?:bar|hat|vec|tilde|overline)(?![a-zA-Z])\s*/g, '')
    .replace(/\\([a-zA-Z]+)/g, (m, name) => SYMBOLS[name] ?? name)
    .replace(/\\[,;:! ]/g, ' ')
    .replace(/\\\\/g, ' ')
    .replace(/\\([$%#&_|])/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/\(([\p{L}\p{N}.]+)\)(?=\/)/gu, '$1')
    .replace(/\/\(([\p{L}\p{N}.]+)\)/gu, '/$1')
    .replace(/\u0001/g, '{').replace(/\u0002/g, '}')
    .replace(/&/g, ' ')
    .replace(/[ \t]+/g, ' ');
  return s.trim();
}
