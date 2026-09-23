(function () {
  'use strict';

  const data = window.APP_DATA || { subjects: [], sessions: {}, materials: [] };
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  const STORE = 'konsp-mini-v2';
  const LEGACY_STORES = ['konsp-mini-v1'];

  const palettes = [
    { id: 'violet', name: 'Фиолет', dark: ['#0b0b18','#14142a','#1c1c38','#f7f5ff','#aaa8c7','#303056','#8f7cff','#55d6ff','#8f7cff26','#0000004a'], light: ['#f5f3ff','#ffffff','#ece8ff','#211a38','#6d6880','#ddd6ff','#6f56d9','#168db0','#6f56d91c','#3b2d6b18'] },
    { id: 'blue', name: 'Синий', dark: ['#07111e','#0e2034','#15304c','#f2f8ff','#9cb0c5','#294968','#5f9dff','#55d9ff','#5f9dff24','#00000048'], light: ['#f2f7ff','#ffffff','#e8f1ff','#17283c','#68788a','#d4e3f7','#3977d9','#1192b5','#3977d91b','#274b7416'] },
    { id: 'emerald', name: 'Зелёный', dark: ['#071511','#0e251d','#15362a','#f1fff8','#95baa8','#285343','#42d596','#a6e85d','#42d59624','#00000048'], light: ['#f0fbf6','#ffffff','#e1f5eb','#163529','#627b6e','#cceadb','#2c9a6c','#6ba625','#2c9a6c1b','#1f5a4016'] },
    { id: 'crimson', name: 'Красный', dark: ['#19090d','#2a1118','#381923','#fff2f4','#c9a0a7','#58303a','#ff6e82','#ffb46b','#ff6e8224','#0000004b'], light: ['#fff3f5','#ffffff','#ffe7eb','#3c1b22','#80656a','#f3d2d8','#d94d63','#cb7b28','#d94d631c','#682c3714'] },
    { id: 'graphite', name: 'Графит', dark: ['#0d1014','#171b21','#222831','#f3f5f7','#a3abb5','#353d49','#aeb9c7','#71c8d8','#aeb9c71d','#00000052'], light: ['#f4f5f6','#ffffff','#e9ecef','#1e2329','#6d747c','#d9dee4','#596574','#217f91','#5965741b','#242b3412'] },
    { id: 'warm', name: 'Тёплая', dark: ['#18100a','#291a10','#382417','#fff7ed','#cbb09b','#58402f','#f59a5b','#f2d06d','#f59a5b24','#0000004b'], light: ['#fff8ef','#fffdf9','#f8ead8','#3b2a1c','#7f6d5e','#ead7be','#c76f32','#aa861f','#c76f321b','#6b462414'] },
    { id: 'ocean', name: 'Океан', dark: ['#06161a','#0b252d','#113641','#effcff','#8fb7bf','#285661','#35bce7','#5ce1bd','#35bce724','#00000048'], light: ['#eefbfc','#ffffff','#def5f7','#143239','#607d82','#c6e8ec','#168cae','#278c71','#168cae1b','#154c5714'] },
    { id: 'mint', name: 'Мята', dark: ['#081613','#102721','#17382f','#f0fff9','#92b9aa','#2a5546','#4fd3a6','#b6e56d','#4fd3a624','#00000048'], light: ['#f0fcf7','#ffffff','#dff5eb','#17362c','#637d72','#cbe9db','#2e9d77','#79a62a','#2e9d771b','#23574414'] },
    { id: 'rose', name: 'Роза', dark: ['#180a13','#291321','#381a2e','#fff3fb','#c6a2b9','#553047','#ec74b8','#ad8bff','#ec74b824','#0000004b'], light: ['#fff2fa','#ffffff','#f9e3f1','#3a1b30','#7f6375','#efd0e5','#c94f94','#7550d4','#c94f941b','#64315314'] },
    { id: 'amber', name: 'Янтарь', dark: ['#171207','#29200d','#382d14','#fff9e9','#c6b68c','#584a29','#e6ad37','#f3dc69','#e6ad3724','#00000049'], light: ['#fff9e9','#ffffff','#f9edc7','#3a3018','#7e7356','#ecdeb0','#b77e13','#9d8b18','#b77e131c','#62501214'] },
    { id: 'indigo', name: 'Индиго', dark: ['#0b0d1b','#161a31','#202643','#f5f6ff','#a6acca','#363e63','#7284ff','#b273ff','#7284ff24','#0000004b'], light: ['#f3f4ff','#ffffff','#e8eafe','#202544','#6b708d','#d7daf8','#5366d8','#874bc3','#5366d81b','#313b7414'] },
    { id: 'cyan', name: 'Бирюза', dark: ['#061416','#0d2428','#14343a','#effdff','#91b6ba','#295158','#43cad3','#75e59c','#43cad324','#00000048'], light: ['#eefafb','#ffffff','#dff3f5','#153539','#637d80','#cce7e9','#2099a1','#3b9960','#2099a11b','#1b565b14'] }
  ];

  const fonts = [
    { id: 'system', name: 'System', stack: '-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif', sample: 'Чистый системный шрифт' },
    { id: 'rounded', name: 'Rounded', stack: '"Arial Rounded MT Bold","Trebuchet MS",Arial,sans-serif', sample: 'Мягкий и округлый' },
    { id: 'humanist', name: 'Humanist', stack: '"Trebuchet MS","Segoe UI",Arial,sans-serif', sample: 'Дружелюбный для чтения' },
    { id: 'geometric', name: 'Geometric', stack: '"Avenir Next","Century Gothic",Arial,sans-serif', sample: 'Современный геометричный' },
    { id: 'classic', name: 'Classic', stack: 'Georgia,"Times New Roman",serif', sample: 'Учебная классика' },
    { id: 'serif', name: 'Serif', stack: '"Palatino Linotype",Palatino,Georgia,serif', sample: 'Спокойный книжный' },
    { id: 'mono', name: 'Mono', stack: 'ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace', sample: 'Технический моноширинный' },
    { id: 'compact', name: 'Compact', stack: '"Arial Narrow","Helvetica Neue Condensed",Arial,sans-serif', sample: 'Компактный интерфейсный' }
  ];

  const accentClass = { violet: 'accent-violet', cyan: 'accent-cyan', amber: 'accent-amber', blue: 'accent-blue', rose: 'accent-rose', emerald: 'accent-emerald' };
  let state = loadState();
  let route = parseHash();
  let toastTimer = null;
  let quizRuntime = null;
  let sessionRuntime = null;
  let currentMathRoot = null;
  let focusMode = false;

  function $(id) { return document.getElementById(id); }
  function esc(value) { const el = document.createElement('div'); el.textContent = value == null ? '' : String(value); return el.innerHTML; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function stripHtml(value) { const el = document.createElement('div'); el.innerHTML = value || ''; return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function shuffle(items) { const arr = items.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  function formatCount(n, one, few, many) { const n10 = n % 10, n100 = n % 100; if (n10 === 1 && n100 !== 11) return one; if (n10 >= 2 && n10 <= 4 && !(n100 >= 12 && n100 <= 14)) return few; return many; }

  function sanitizeHtml(input, mode) {
    const t = document.createElement('template');
    t.innerHTML = String(input || '');
    const richTags = new Set(['STRONG','EM','CODE','SPAN','BR','SUB','SUP']);
    const lectureTags = new Set(['P','H3','H4','UL','OL','LI','TABLE','THEAD','TBODY','TR','TH','TD','DIV','SPAN','STRONG','EM','CODE','BR','BLOCKQUOTE','SUB','SUP']);
    const allowed = mode === 'lecture' ? lectureTags : richTags;
    const allowedClasses = new Set(['formula','math-display','callout','tip','example','warning','note','callout-title','callout-icon','callout-body']);
    function clean(node) {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (!allowed.has(child.tagName)) {
            child.replaceWith(document.createTextNode(child.textContent || ''));
            return;
          }
          Array.from(child.attributes).forEach(attr => {
            if (attr.name === 'class') {
              const keep = attr.value.split(/\s+/).filter(c => allowedClasses.has(c));
              if (keep.length) child.setAttribute('class', keep.join(' ')); else child.removeAttribute('class');
            } else if ((attr.name === 'colspan' || attr.name === 'rowspan') && ['TD','TH'].includes(child.tagName)) {
              const v = clamp(parseInt(attr.value, 10) || 1, 1, 20); child.setAttribute(attr.name, String(v));
            } else {
              child.removeAttribute(attr.name);
            }
          });
          clean(child);
        } else if (child.nodeType !== Node.TEXT_NODE) {
          child.remove();
        }
      });
    }
    clean(t.content);
    return t.innerHTML;
  }

  const MathRenderer = {
    retryTimer: null,
    normalize(tex) {
      let s = String(tex || '').trim();
      if (!s) return s;
      const envRe = /\\begin\{(pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|matrix|cases)\}([\s\S]*?)\\end\{\1\}/g;
      s = s.replace(envRe, (whole, env, body) => {
        let out = '';
        for (let i = 0; i < body.length; i++) {
          const ch = body[i];
          if (ch !== '\\') { out += ch; continue; }
          const next = body[i + 1] || '';
          if (next === '\\') { out += '\\\\'; i += 1; continue; }
          if (/[A-Za-z]/.test(next)) {
            const m = body.slice(i + 1).match(/^([A-Za-z]+)/);
            const cmd = m ? m[1] : '';
            const known = new Set(['alpha','beta','gamma','delta','Delta','varepsilon','epsilon','varphi','phi','omega','tau','frac','dfrac','sqrt','cdot','circ','cos','sin','tan','tg','det','lim','limits','sum','sup','max','min','ln','log','exp','vec','overline','text','mathrm','mathbf','mathit','mathbb','left','right','to','rightarrow','leftrightarrow','iff','infty','land','lor','forall','exists','in','notin','subset','subseteq','cup','cap','setminus','varnothing','emptyset','ne','neq','le','leq','ge','geq','approx','pm','mid','quad','qquad','dots','vdots','begin','end']);
            if (known.has(cmd)) { out += ch; continue; }
          }
          if (next === ',' || next === ';' || next === ':' || next === '!' || next === '%' || next === '{') { out += ch; continue; }
          out += '\\\\';
        }
        return `\\begin{${env}}${out}\\end{${env}}`;
      });
      return s.replace(/\u00a0/g, ' ');
    },
    looksLikeTex(tex) { return /\\[A-Za-z]+|\\begin\{|[{}]|[_^]/.test(tex); },
    fallback(tex) {
      let s = this.normalize(tex);
      s = s.replace(/\\begin\{(pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|matrix|cases)\}([\s\S]*?)\\end\{\1\}/g, (_, env, body) => {
        const rows = body.split(/\\\\/).map(row => row.split('&').map(cell => this.fallback(cell).trim()).filter(Boolean).join('  ')).filter(Boolean);
        const left = /v|V/.test(env) ? '|' : env === 'cases' ? '{' : '[';
        const right = /v|V/.test(env) ? '|' : env === 'cases' ? '' : ']';
        return `${left}${rows.join(' ; ')}${right}`;
      });
      for (let i = 0; i < 4; i++) {
        s = s.replace(/\\(?:d?frac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
        s = s.replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]*)\}/g, '√[$1]($2)');
        s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)');
        s = s.replace(/\\(?:text|mathrm|mathbf|mathit)\s*\{([^{}]*)\}/g, '$1');
        s = s.replace(/\\overline\s*\{([^{}]*)\}/g, 'overline($1)');
      }
      const map = {
        '\\mathbb{N}':'ℕ','\\mathbb{Z}':'ℤ','\\mathbb{Q}':'ℚ','\\mathbb{R}':'ℝ','\\mathbb{C}':'ℂ',
        '\\alpha':'α','\\beta':'β','\\gamma':'γ','\\Delta':'Δ','\\delta':'δ','\\varepsilon':'ε','\\epsilon':'ε','\\varphi':'φ','\\phi':'φ','\\omega':'ω','\\tau':'τ',
        '\\infty':'∞','\\to':'→','\\rightarrow':'→','\\leftrightarrow':'↔','\\iff':'⇔','\\leq':'≤','\\geq':'≥','\\ne':'≠','\\in':'∈','\\notin':'∉','\\subset':'⊂','\\subseteq':'⊆','\\cup':'∪','\\cap':'∩','\\varnothing':'∅','\\emptyset':'∅','\\land':'∧','\\lor':'∨','\\forall':'∀','\\exists':'∃','\\cdot':'·','\\pm':'±','\\approx':'≈','\\sum':'Σ','\\sup':'sup','\\lim':'lim','\\det':'det','\\sin':'sin','\\cos':'cos','\\tan':'tan','\\vec':'→','\\dots':'…','\\vdots':'⋮','\\circ':'°','\\setminus':'∖','\\mid':'|'
      };
      Object.keys(map).forEach(k => { s = s.split(k).join(map[k]); });
      s = s.replace(/\\(?:left|right|displaystyle|limits|qquad|quad)\b/g, '');
      s = s.replace(/\\,/g, ' ').replace(/\\;/g, ' ').replace(/\\!/g, '');
      s = s.replace(/\\([A-Za-z]+)/g, '$1');
      s = s.replace(/\{([^{}]*)\}/g, '($1)').replace(/[{}]/g, '');
      s = s.replace(/\s+/g, ' ').trim();
      return s;
    },
    prepare(root) {
      if (!root) return [];
      const out = [];
      root.querySelectorAll('.formula,.math-display').forEach(el => {
        if (el.querySelector('mjx-container')) return;
        const source = el.dataset.tex || el.textContent || '';
        const tex = this.normalize(source);
        if (!this.looksLikeTex(tex)) return;
        el.dataset.tex = tex;
        el.dataset.mathDisplay = el.classList.contains('math-display') ? '1' : '0';
        el.textContent = this.fallback(tex);
        el.classList.add('math-pending');
        out.push(el);
      });
      return out;
    },
    async render(root) {
      if (!root || !document.documentElement.contains(root)) return;
      this.prepare(root);
      const mj = window.MathJax;
      if (!mj || !mj.typesetPromise) {
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
          if (document.documentElement.contains(root) && window.MathJax && window.MathJax.typesetPromise) this.render(root);
        }, 600);
        return;
      }
      const nodes = Array.from(root.querySelectorAll('.math-pending[data-tex]'));
      if (!nodes.length) return;
      nodes.forEach(el => { el.textContent = (el.dataset.mathDisplay === '1' ? '\\[' : '\\(') + el.dataset.tex + (el.dataset.mathDisplay === '1' ? '\\]' : '\\)'); });
      try {
        if (mj.startup && mj.startup.promise) await mj.startup.promise;
        await mj.typesetPromise(nodes);
        nodes.forEach(el => el.classList.remove('math-pending'));
      } catch (err) {
        nodes.forEach(el => { el.textContent = this.fallback(el.dataset.tex || ''); el.classList.add('math-fallback'); el.classList.remove('math-pending'); });
      }
    },
    clear(root) {
      try { if (window.MathJax && window.MathJax.typesetClear && root) window.MathJax.typesetClear([root]); } catch (e) {}
    }
  };

  function defaultState() {
    return { schemaVersion: 2, scheme: 'auto', palette: 'violet', font: 'system', fs: 16, lineHeight: 1.7, readerWidth: 'normal', done: {}, sessionStatus: {}, quizAssessment: {} };
  }

  function loadState() {
    const base = defaultState();
    let loaded = null;
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) loaded = JSON.parse(raw);
      if (!loaded) {
        for (const key of LEGACY_STORES) {
          const legacy = localStorage.getItem(key);
          if (legacy) { loaded = JSON.parse(legacy); break; }
        }
      }
    } catch (e) {}
    if (loaded && typeof loaded === 'object') Object.assign(base, loaded);
    if (!base.done || typeof base.done !== 'object') base.done = {};
    if (!base.sessionStatus || typeof base.sessionStatus !== 'object') base.sessionStatus = {};
    if (!base.quizAssessment || typeof base.quizAssessment !== 'object') base.quizAssessment = {};
    if (loaded && loaded.sessionDone && typeof loaded.sessionDone === 'object') {
      Object.keys(loaded.sessionDone).forEach(k => { if (loaded.sessionDone[k] && !base.sessionStatus[k]) base.sessionStatus[k] = 'know'; });
    }
    const legacyThemeMap = { midnight: 'violet', graphite: 'graphite', ocean: 'ocean', emerald: 'emerald', violet: 'violet', rose: 'rose', sunset: 'warm', lavender: 'indigo', mint: 'mint', sky: 'blue', sand: 'amber', paper: 'warm', snow: 'blue' };
    if (loaded && loaded.theme && !loaded.palette) base.palette = legacyThemeMap[loaded.theme] || 'violet';
    if (loaded && (loaded.theme === 'paper' || loaded.theme === 'snow')) base.scheme = 'light';
    base.fs = clamp(Number(base.fs) || 16, 14, 22);
    base.lineHeight = clamp(Number(base.lineHeight) || 1.7, 1.45, 2.0);
    if (!['auto','light','dark'].includes(base.scheme)) base.scheme = 'auto';
    if (!['narrow','normal','wide'].includes(base.readerWidth)) base.readerWidth = 'normal';
    if (!palettes.some(x => x.id === base.palette)) base.palette = 'violet';
    if (!fonts.some(x => x.id === base.font)) base.font = 'system';
    base.schemaVersion = 2;
    return base;
  }

  function saveState() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }
  function resolvedScheme() { if (state.scheme !== 'auto') return state.scheme; if (tg && (tg.colorScheme === 'light' || tg.colorScheme === 'dark')) return tg.colorScheme; return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; }
  function applyAppearance() {
    const p = palettes.find(x => x.id === state.palette) || palettes[0];
    const scheme = resolvedScheme();
    const a = scheme === 'light' ? p.light : p.dark;
    const names = ['bg','panel','panel2','text','muted','line','accent','accent2','soft','shadow'];
    names.forEach((name, i) => document.documentElement.style.setProperty(`--${name}`, a[i]));
    const f = fonts.find(x => x.id === state.font) || fonts[0];
    document.documentElement.style.setProperty('--font', f.stack);
    document.documentElement.style.setProperty('--fs', `${state.fs}px`);
    document.documentElement.style.setProperty('--reading-line', String(state.lineHeight));
    document.documentElement.style.setProperty('--reader-width', state.readerWidth === 'narrow' ? '680px' : state.readerWidth === 'wide' ? '1040px' : '820px');
    document.documentElement.dataset.scheme = scheme;
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', a[0]);
    if (tg) { try { tg.setHeaderColor(a[0]); tg.setBackgroundColor(a[0]); if (tg.setBottomBarColor) tg.setBottomBarColor(a[0]); } catch (e) {} }
  }

  function initTelegram() {
    if (!tg) { updateViewportVars(); return; }
    try { tg.ready(); tg.expand(); } catch (e) {}
    const sync = () => updateViewportVars();
    try {
      if (tg.onEvent) { tg.onEvent('viewportChanged', sync); tg.onEvent('safeAreaChanged', sync); tg.onEvent('contentSafeAreaChanged', sync); tg.onEvent('themeChanged', () => { if (state.scheme === 'auto') applyAppearance(); }); }
    } catch (e) {}
    updateViewportVars();
  }

  function updateViewportVars() {
    const root = document.documentElement;
    const height = tg && (tg.viewportHeight || tg.viewportStableHeight) ? (tg.viewportHeight || tg.viewportStableHeight) : window.innerHeight;
    root.style.setProperty('--app-height', `${Math.max(320, Math.round(height || window.innerHeight))}px`);
    if (tg && tg.safeAreaInset) {
      root.style.setProperty('--tg-safe-top-js', `${tg.safeAreaInset.top || 0}px`);
      root.style.setProperty('--tg-safe-bottom-js', `${tg.safeAreaInset.bottom || 0}px`);
      root.style.setProperty('--tg-safe-left-js', `${tg.safeAreaInset.left || 0}px`);
      root.style.setProperty('--tg-safe-right-js', `${tg.safeAreaInset.right || 0}px`);
    }
    if (tg && tg.contentSafeAreaInset) root.style.setProperty('--tg-content-bottom-js', `${tg.contentSafeAreaInset.bottom || 0}px`);
  }

  function getSubject(id) { return (data.subjects || []).find(s => String(s.id) === String(id)) || null; }
  function getLecture(subject, num) { return subject ? (subject.lectures || []).find(l => Number(l.num) === Number(num)) || null : null; }
  function getCards(subject, num) { return subject ? (subject.cards || []).filter(c => Number(c.lecture) === Number(num)) : []; }
  function getQuestions(subject, num) { return subject ? (subject.questions || []).filter(q => num == null || Number(q.lecture) === Number(num)) : []; }
  function getSessionForSubject(subjectId) { return Object.values(data.sessions || {}).find(s => s.subjectId === subjectId) || null; }
  function lectureKey(subject, lecture) { return `${subject.id}::${lecture.id}`; }
  function isLectureDone(subject, lecture) { return !!state.done[lectureKey(subject, lecture)]; }
  function subjectDone(subject) { return (subject.lectures || []).filter(l => isLectureDone(subject, l)).length; }
  function totalLectures() { return (data.subjects || []).reduce((n, s) => n + (s.lectures || []).length, 0); }
  function totalDone() { return (data.subjects || []).reduce((n, s) => n + subjectDone(s), 0); }
  function statusKey(exam, q) { return `session::${exam.id}::${q.n}`; }
  function getStatus(exam, q) { return state.sessionStatus[statusKey(exam, q)] || 'new'; }
  function setStatus(exam, q, value) { if (value === 'new') delete state.sessionStatus[statusKey(exam, q)]; else state.sessionStatus[statusKey(exam, q)] = value; saveState(); }
  function sessionStats(exam) { let learning = 0, know = 0; (exam.questions || []).forEach(q => { const s = getStatus(exam, q); if (s === 'learning') learning++; if (s === 'know') know++; }); return { total: (exam.questions || []).length, learning, know }; }

  function parseHash() {
    const h = (location.hash || '#/').replace(/^#/, '');
    const parts = h.split('/').filter(Boolean).map(decodeURIComponent);
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'subject' && parts[1]) return { name: 'subject', id: parts[1] };
    if (parts[0] === 'lecture' && parts[1] && parts[2]) return { name: 'lecture', id: parts[1], num: Number(parts[2]) };
    if (parts[0] === 'quiz' && parts[1]) return { name: 'quiz', id: parts[1], num: parts[2] ? Number(parts[2]) : null };
    if (parts[0] === 'session' && parts[1] && parts[2] === 'train') return { name: 'sessionTrain', id: parts[1] };
    if (parts[0] === 'session' && parts[1] && parts[2] === 'random') return { name: 'sessionRandom', id: parts[1] };
    if (parts[0] === 'session' && parts[1] && parts[2] === 'one' && parts[3]) return { name: 'sessionOne', id: parts[1], qn: Number(parts[3]) };
    if (parts[0] === 'session' && parts[1]) return { name: 'sessionExam', id: parts[1] };
    if (parts[0] === 'session') return { name: 'session' };
    if (parts[0] === 'materials') return { name: 'materials', subjectId: parts[1] || null };
    if (parts[0] === 'settings') return { name: 'settings' };
    if (parts[0] === 'search') return { name: 'search' };
    if (parts[0] === 'english' && parts[1] === 'vocabulary') return { name: 'englishVocabulary' };
    return { name: 'home' };
  }

  function go(hash) { if (location.hash === hash) { render(); } else location.hash = hash; }
  function parentHash(r) {
    if (r.name === 'subject') return '#/';
    if (r.name === 'lecture') return `#/subject/${encodeURIComponent(r.id)}`;
    if (r.name === 'quiz') return r.num ? `#/lecture/${encodeURIComponent(r.id)}/${r.num}` : `#/subject/${encodeURIComponent(r.id)}`;
    if (r.name === 'sessionExam') return '#/session';
    if (r.name === 'sessionTrain' || r.name === 'sessionRandom' || r.name === 'sessionOne') return `#/session/${encodeURIComponent(r.id)}`;
    if (r.name === 'materials' && r.subjectId) return '#/materials';
    if (r.name === 'englishVocabulary') return '#/subject/%D0%B0%D0%BD%D0%B3%D0%BB%D0%B8%D0%B9%D1%81%D0%BA%D0%B8%D0%B9-%D1%8F%D0%B7%D1%8B%D0%BA';
    if (['session','materials','settings','search'].includes(r.name)) return '#/';
    return '#/';
  }

  function showToast(msg) { clearTimeout(toastTimer); const el = $('toast'); el.textContent = msg; el.classList.add('show'); toastTimer = setTimeout(() => el.classList.remove('show'), 1800); }
  function haptic(type) { if (!tg || !tg.HapticFeedback) return; try { if (type === 'success') tg.HapticFeedback.notificationOccurred('success'); else tg.HapticFeedback.impactOccurred(type || 'light'); } catch (e) {} }

  function setFocusMode(enabled, announce) {
    focusMode = !!enabled && route.name === 'lecture';
    document.body.classList.toggle('focus-mode', focusMode);
    const btn = $('focusModeBtn');
    if (btn) {
      btn.classList.toggle('active', focusMode);
      btn.setAttribute('aria-pressed', String(focusMode));
      const icon = btn.querySelector('[data-focus-icon]');
      const label = btn.querySelector('[data-focus-label]');
      if (icon) icon.textContent = focusMode ? '↙' : '↗';
      if (label) label.textContent = focusMode ? 'Выйти из фокуса' : 'Режим фокуса';
      btn.setAttribute('aria-label', focusMode ? 'Выйти из режима фокуса' : 'Включить режим фокуса');
    }
    if (announce) { haptic('light'); showToast(focusMode ? 'Режим фокуса включён' : 'Режим фокуса выключен'); }
  }

  function animateScreen(root) {
    root.classList.remove('screen-enter');
    void root.offsetWidth;
    root.classList.add('screen-enter');
  }

  function setScreen(html, className) {
    const root = $('screen');
    MathRenderer.clear(root);
    root.className = `screen ${className || ''}`.trim();
    root.innerHTML = html;
    animateScreen(root);
    currentMathRoot = root;
    requestAnimationFrame(() => MathRenderer.render(root));
    return root;
  }

  function routeGroup(name) {
    if (['session','sessionExam','sessionTrain','sessionRandom','sessionOne'].includes(name)) return 'session';
    if (name === 'materials') return 'materials';
    if (name === 'settings') return 'settings';
    return 'home';
  }

  function updateChrome() {
    route = parseHash();
    const group = routeGroup(route.name);
    const titles = { home: ['Конспекты','Главная'], subject: ['Предметы','Лекции'], lecture: ['Лекция','Чтение'], quiz: ['Самопроверка','Квиз'], session: ['Подготовка','Сессия'], sessionExam: ['Сессия','Вопросы'], sessionTrain: ['Сессия','Тренировка'], sessionRandom: ['Сессия','Случайный вопрос'], sessionOne: ['Сессия','Тренировка вопроса'], materials: ['Конспекты','Материалы'], settings: ['Конспекты','Настройки'], search: ['Конспекты','Поиск'], englishVocabulary: ['Английский','Vocabulary'] };
    let [crumb, title] = titles[route.name] || titles.home;
    if (route.name === 'subject') { const s = getSubject(route.id); crumb = 'Предмет'; title = s ? s.name : 'Лекции'; }
    if (route.name === 'lecture') { const s = getSubject(route.id), l = getLecture(s, route.num); crumb = s ? s.name : 'Лекция'; title = l ? l.title : 'Лекция'; }
    if (route.name === 'quiz') { const s = getSubject(route.id); crumb = s ? s.name : 'Квиз'; title = route.num ? 'Квиз по лекции' : 'Квиз по дисциплине'; }
    if (route.name === 'sessionExam' || route.name === 'sessionTrain' || route.name === 'sessionRandom' || route.name === 'sessionOne') { const e = data.sessions && data.sessions[route.id]; title = e ? e.name : title; }
    $('crumb').textContent = crumb; $('screenTitle').textContent = title;
    const isHome = route.name === 'home';
    const left = $('leftBtn'); left.textContent = isHome ? '☰' : '←'; left.setAttribute('aria-label', isHome ? 'Меню' : 'Назад');
    document.body.classList.toggle('reader-route', route.name === 'lecture');
    if (route.name !== 'lecture') focusMode = false;
    document.body.classList.toggle('focus-mode', focusMode && route.name === 'lecture');
    document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === group));
    if (tg && tg.BackButton) {
      try { if (typeof tg.BackButton.offClick === 'function') tg.BackButton.offClick(onTelegramBack); } catch (e) {}
      try {
        if (!isHome) {
          if (typeof tg.BackButton.onClick === 'function') tg.BackButton.onClick(onTelegramBack);
          if (typeof tg.BackButton.show === 'function') tg.BackButton.show();
        } else if (typeof tg.BackButton.hide === 'function') tg.BackButton.hide();
      } catch (e) {}
    }
    renderSidebarSubjects();
  }

  function onTelegramBack() { if (focusMode) { setFocusMode(false, true); return; } go(parentHash(route)); }

  function renderSidebarSubjects() {
    const box = $('sidebarSubjects'); if (!box) return;
    const activeSubjectId = ['subject','lecture','quiz'].includes(route.name) ? route.id : (route.name === 'englishVocabulary' ? 'английский-язык' : null);
    box.innerHTML = (data.subjects || []).map(s => {
      const active = String(activeSubjectId || '') === String(s.id);
      const total = (s.lectures || []).length;
      const done = subjectDone(s);
      return `<button class="side-subject ${accentClass[s.meta && s.meta.accent] || ''} ${active ? 'active' : ''}" data-route="#/subject/${encodeURIComponent(s.id)}" type="button" ${active ? 'aria-current="page"' : ''} title="${esc(s.name)}"><span class="side-subject-icon">${esc(s.meta && s.meta.icon || s.name[0])}</span><span>${esc(s.meta && s.meta.short || s.name)}</span><small>${done}/${total}</small></button>`;
    }).join('');
    bindRoutes(box);
  }

  function render() {
    updateChrome();
    if (route.name === 'home') renderHome();
    else if (route.name === 'subject') renderSubject();
    else if (route.name === 'lecture') renderLecture();
    else if (route.name === 'quiz') renderQuizPage();
    else if (route.name === 'session') renderSessionHome();
    else if (route.name === 'sessionExam') renderSessionExam();
    else if (route.name === 'sessionTrain' || route.name === 'sessionRandom' || route.name === 'sessionOne') renderSessionTraining();
    else if (route.name === 'materials') renderMaterials();
    else if (route.name === 'settings') renderSettings();
    else if (route.name === 'search') renderSearch();
    else if (route.name === 'englishVocabulary') renderEnglishVocabulary();
    if (route.name !== 'lecture') window.scrollTo(0, 0);
  }

  function heroStat(icon, value, label) { return `<div class="hero-stat"><span>${icon}</span><div><b>${value}</b><small>${esc(label)}</small></div></div>`; }
  function subjectCard(s) {
    const total = (s.lectures || []).length, done = subjectDone(s), pct = total ? Math.round(done / total * 100) : 0;
    const qCount = (s.questions || []).length;
    return `<button class="subject-card ${accentClass[s.meta && s.meta.accent] || ''}" data-route="#/subject/${encodeURIComponent(s.id)}" type="button"><div class="subject-glow"></div><div class="card-top"><span class="subject-icon">${esc(s.meta && s.meta.icon || s.name[0])}</span><span class="subject-copy"><b>${esc(s.name)}</b><small>${total} ${formatCount(total,'лекция','лекции','лекций')} · ${qCount} вопросов</small></span><span class="card-arrow">→</span></div><div class="progress"><i style="width:${pct}%"></i></div><div class="card-foot"><span>${done}/${total} пройдено</span><strong>${pct}%</strong></div></button>`;
  }

  function renderHome() {
    const known = Object.values(data.sessions || {}).reduce((n, ex) => n + sessionStats(ex).know, 0);
    const sessionTotal = Object.values(data.sessions || {}).reduce((n, ex) => n + (ex.questions || []).length, 0);
    const root = setScreen(`<section class="dashboard-hero"><div class="eyebrow">Учебный dashboard</div><h1>Конспекты без хаоса</h1><p>Лекции, самопроверка, вопросы сессии и исходные материалы — в одном приложении.</p><div class="hero-stats">${heroStat('✓', `${totalDone()}/${totalLectures()}`, 'лекций пройдено')}${heroStat('🎯', known, 'вопросов знаю')}${heroStat('📎', (data.materials || []).length, 'материалов')}</div></section><section class="quick-grid"><button class="quick-card" data-route="#/session"><span>🎯</span><div><b>Сессия</b><small>${sessionTotal} вопросов из присланных списков</small></div><i>→</i></button><button class="quick-card" data-route="#/materials"><span>📎</span><div><b>Материалы</b><small>PDF, DOC и DOCX без потерь</small></div><i>→</i></button><button class="quick-card" data-route="#/search"><span>⌕</span><div><b>Поиск</b><small>Лекции, вопросы и файлы</small></div><i>→</i></button></section><div class="section-head"><div><span class="eyebrow">Предметы</span><h2>Что учим</h2></div><span class="section-meta">${(data.subjects || []).length} дисциплин</span></div><section class="subjects-grid">${(data.subjects || []).map(subjectCard).join('')}</section>`, 'dashboard-screen');
    bindRoutes(root);
  }

  function renderSubject() {
    const s = getSubject(route.id); if (!s) { go('#/'); return; }
    const total = (s.lectures || []).length, done = subjectDone(s), pct = total ? Math.round(done / total * 100) : 0;
    const qs = getQuestions(s), ex = getSessionForSubject(s.id);
    const actions = [];
    if (qs.length) actions.push(`<button class="action-card" data-route="#/quiz/${encodeURIComponent(s.id)}"><span>🧠</span><div><b>Квиз по дисциплине</b><small>${qs.length} вопросов · случайный порядок</small></div><i>→</i></button>`);
    if (ex) actions.push(`<button class="action-card" data-route="#/session/${encodeURIComponent(ex.id)}"><span>🎯</span><div><b>Вопросы сессии</b><small>${(ex.questions || []).length} вопросов · статусы подготовки</small></div><i>→</i></button>`);
    if (s.id === 'английский-язык') actions.push(`<button class="action-card" data-route="#/english/vocabulary"><span>ABC</span><div><b>Vocabulary</b><small>Units 1–4 · произношение и примеры</small></div><i>→</i></button>`);
    const lectures = (s.lectures || []).map(l => {
      const cards = getCards(s, l.num), qn = getQuestions(s, l.num).length, finished = isLectureDone(s, l);
      return `<button class="lecture-card ${finished ? 'done' : ''}" data-route="#/lecture/${encodeURIComponent(s.id)}/${l.num}"><div class="lecture-index">${finished ? '✓' : l.num}</div><div class="lecture-copy"><b>${esc(l.title)}</b><p>${esc(l.summary || 'Материал лекции')}</p><div class="lecture-meta"><span>${cards.length} ${formatCount(cards.length,'раздел','раздела','разделов')}</span><span>${qn} ${formatCount(qn,'вопрос','вопроса','вопросов')}</span></div></div><span class="card-arrow">→</span></button>`;
    }).join('');
    const root = setScreen(`<button class="inline-back" data-route="#/">← Все предметы</button><section class="subject-hero ${accentClass[s.meta && s.meta.accent] || ''}"><div class="subject-hero-icon">${esc(s.meta && s.meta.icon || s.name[0])}</div><div><span class="eyebrow">Дисциплина</span><h1>${esc(s.name)}</h1><p>${total} ${formatCount(total,'лекция','лекции','лекций')} · ${done} пройдено</p><div class="progress large"><i style="width:${pct}%"></i></div></div></section>${actions.length ? `<section class="subject-actions">${actions.join('')}</section>` : ''}<div class="section-head"><div><span class="eyebrow">Лекции</span><h2>Материалы курса</h2></div></div><section class="lectures-grid">${lectures || '<div class="empty-state"><b>Лекций пока нет</b><span>Раздел корректно работает и с пустыми данными.</span></div>'}</section>`, 'subject-screen');
    bindRoutes(root);
  }

  function enhanceLecture(root) {
    root.querySelectorAll('.reading-section').forEach((section, idx) => {
      section.id = `section-${idx + 1}`;
      section.querySelectorAll('p').forEach(p => { if (!p.textContent.trim() && !p.querySelector('img,br')) p.remove(); });
      section.querySelectorAll('table').forEach(table => { if (table.parentElement && table.parentElement.classList.contains('table-scroll')) return; const wrap = document.createElement('div'); wrap.className = 'table-scroll'; table.parentNode.insertBefore(wrap, table); wrap.appendChild(table); });
      section.querySelectorAll('.callout').forEach(c => {
        // Legacy data.js stores one-letter technical markers (N/E/T/W/Q)
        // inside .callout-icon. They are metadata, not lecture content.
        // Remove them from the DOM so they never appear before titles,
        // get copied with the text, or surface to screen readers.
        c.querySelectorAll('.callout-icon').forEach(icon => icon.remove());

        const kind = c.classList.contains('warning') ? 'Важно' : c.classList.contains('example') ? 'Пример' : c.classList.contains('tip') ? 'Запомни' : 'Главное';
        if (!c.querySelector('.callout-kicker')) { const badge = document.createElement('div'); badge.className = 'callout-kicker'; badge.textContent = kind; c.insertBefore(badge, c.firstChild); }
      });
    });
  }

  function renderLecture() {
    const s = getSubject(route.id), l = getLecture(s, route.num); if (!s || !l) { go('#/'); return; }
    const cards = getCards(s, l.num), qs = getQuestions(s, l.num), done = isLectureDone(s, l);
    const sections = cards.map((c, idx) => `<article class="reading-section"><div class="section-title"><span>${idx + 1}</span><h2>${esc(c.title || `Раздел ${idx + 1}`)}</h2></div><div class="section-content">${sanitizeHtml(c.body || '<p>Раздел пуст.</p>', 'lecture')}</div></article>`).join('');
    const toc = cards.map((c, idx) => `<button data-scroll="section-${idx + 1}"><span>${idx + 1}</span>${esc(c.title || `Раздел ${idx + 1}`)}</button>`).join('');
    const focusLabel = focusMode ? 'Выйти из фокуса' : 'Режим фокуса';
    const root = setScreen(`<div class="reader-toolbar"><button class="inline-back reader-back" data-route="#/subject/${encodeURIComponent(s.id)}">← ${esc(s.name)}</button><button id="focusModeBtn" class="focus-mode-btn ${focusMode ? 'active' : ''}" type="button" aria-pressed="${focusMode}" aria-label="${focusMode ? 'Выйти из режима фокуса' : 'Включить режим фокуса'}"><span data-focus-icon>${focusMode ? '↙' : '↗'}</span><b data-focus-label>${focusLabel}</b></button></div><div class="reader-layout"><main class="reader-main"><section class="reader-hero"><div class="reader-badges"><span>${esc(s.meta && s.meta.short || s.name)}</span><span>${cards.length} разделов</span></div><h1>${esc(l.title)}</h1>${l.summary ? `<p>${esc(l.summary)}</p>` : ''}<div class="reader-top-actions">${qs.length ? `<button class="primary-btn" data-route="#/quiz/${encodeURIComponent(s.id)}/${l.num}">🧠 Самопроверка · ${qs.length}</button>` : '<span class="soft-badge">Вопросов к лекции нет</span>'}<button id="toggleDoneTop" class="secondary-btn ${done ? 'success' : ''}">${done ? '✓ Пройдено' : 'Отметить пройденной'}</button></div></section><div class="reading-flow">${sections || '<div class="empty-state"><b>Лекция пуста</b><span>Исходные данные для этой лекции отсутствуют.</span></div>'}</div><div class="reader-finish"><div><span class="eyebrow">Финиш</span><h2>Лекция завершена</h2><p>Прогресс сохраняется на устройстве.</p></div><div class="reader-finish-actions"><button id="toggleDoneBottom" class="secondary-btn ${done ? 'success' : ''}">${done ? '✓ Пройдено' : 'Отметить пройденной'}</button>${qs.length ? `<button class="primary-btn" data-route="#/quiz/${encodeURIComponent(s.id)}/${l.num}">Перейти к квизу →</button>` : ''}</div></div></main><aside class="reader-aside"><div class="toc-card"><span class="eyebrow">Навигация</span><h3>Содержание</h3><div class="toc-list">${toc || '<span class="muted">Нет разделов</span>'}</div></div></aside></div>`, 'reader-screen');
    enhanceLecture(root); bindRoutes(root);
    root.querySelectorAll('[data-scroll]').forEach(btn => btn.addEventListener('click', () => { const el = document.getElementById(btn.dataset.scroll); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    const toggle = () => { const key = lectureKey(s, l); if (state.done[key]) delete state.done[key]; else state.done[key] = true; saveState(); renderSidebarSubjects(); haptic(state.done[key] ? 'success' : 'light'); showToast(state.done[key] ? 'Лекция отмечена пройденной' : 'Отметка снята'); renderLecture(); };
    const top = $('toggleDoneTop'), bottom = $('toggleDoneBottom'), focusBtn = $('focusModeBtn');
    if (top) top.addEventListener('click', toggle);
    if (bottom) bottom.addEventListener('click', toggle);
    if (focusBtn) focusBtn.addEventListener('click', () => setFocusMode(!focusMode, true));
    setFocusMode(focusMode, false);
  }

  function answerForQuestion(q) { return (data.quizAnswers && data.quizAnswers[q.id]) || q.answer || null; }
  function initQuizRuntime(s, num, items, weakOnly) {
    const key = `${s.id}:${num || 'all'}:${weakOnly ? 'weak' : 'all'}`;
    let pool = items.slice();
    if (weakOnly) pool = pool.filter(q => state.quizAssessment[q.id] === 'weak');
    quizRuntime = { key, subjectId: s.id, num, items: shuffle(pool), index: 0, revealed: false, marked: {}, completed: false, weakOnly: !!weakOnly };
  }

  function renderQuizPage() {
    const s = getSubject(route.id); if (!s) { go('#/'); return; }
    const all = getQuestions(s, route.num);
    const baseKey = `${s.id}:${route.num || 'all'}`;
    if (!quizRuntime || !quizRuntime.key.startsWith(baseKey + ':')) initQuizRuntime(s, route.num, all, false);
    if (!quizRuntime.items.length) {
      const root = setScreen(`<button class="inline-back" data-route="${parentHash(route)}">← Назад</button><div class="empty-state large"><span>🧠</span><b>${quizRuntime.weakOnly ? 'Слабых вопросов пока нет' : 'Вопросов для квиза нет'}</b><p>${quizRuntime.weakOnly ? 'Отметь вопросы «Не знаю», и они появятся здесь.' : 'В исходных данных этой лекции/дисциплины нет вопросов.'}</p>${quizRuntime.weakOnly ? `<button class="primary-btn" id="quizAll">Пройти все вопросы</button>` : ''}</div>`, 'quiz-screen'); bindRoutes(root); const qa = $('quizAll'); if (qa) qa.addEventListener('click', () => { initQuizRuntime(s, route.num, all, false); renderQuizPage(); }); return;
    }
    if (quizRuntime.completed) { renderQuizSummary(s, all); return; }
    const q = quizRuntime.items[quizRuntime.index];
    const answer = answerForQuestion(q);
    const pct = Math.round(((quizRuntime.index + 1) / quizRuntime.items.length) * 100);
    const previousPct = Number.isFinite(quizRuntime.lastPct) ? quizRuntime.lastPct : 0;
    quizRuntime.lastPct = pct;
    const globalMark = state.quizAssessment[q.id] || '';
    const answerBlock = quizRuntime.revealed ? (answer ? `<div class="answer-panel reveal"><div class="answer-label">Подтверждённый ответ</div><div class="answer-text">${sanitizeHtml(answer, 'rich')}</div></div>` : `<div class="answer-panel missing reveal"><div class="answer-label">Ответ отсутствует</div><p>В исходных данных нет подтверждённого ответа на этот вопрос. Hint вместо ответа не используется.</p></div>`) : '';
    const controls = quizRuntime.revealed ? `<div class="self-check"><button class="rate-btn weak ${globalMark === 'weak' ? 'active' : ''}" data-rate="weak">Не знаю</button><button class="rate-btn know ${globalMark === 'know' ? 'active' : ''}" data-rate="know">Знаю</button></div><button class="primary-btn wide" id="nextQuiz">${quizRuntime.index + 1 < quizRuntime.items.length ? 'Следующий →' : 'Завершить'}</button>` : `<button class="primary-btn wide" id="revealQuiz">Показать ответ</button><button class="ghost-btn wide" id="skipQuiz">Пропустить →</button>`;
    const root = setScreen(`<button class="inline-back" data-route="${parentHash(route)}">← Назад</button><section class="quiz-shell"><div class="quiz-head"><div><span class="eyebrow">${route.num ? 'Квиз по лекции' : 'Квиз по дисциплине'}</span><h1>${esc(s.name)}</h1></div><span class="quiz-mode">Случайный порядок</span></div><div class="quiz-progress"><div><span>Вопрос ${quizRuntime.index + 1} из ${quizRuntime.items.length}</span><strong>${pct}%</strong></div><div class="progress quiz-progress-track"><i class="quiz-progress-fill" style="--progress-from:${previousPct}%;--progress-to:${pct}%"></i></div></div><article class="quiz-card ${quizRuntime.revealed ? 'has-answer' : ''}"><div class="quiz-number">${quizRuntime.index + 1}</div><h2>${sanitizeHtml(q.q || q.text || '', 'rich')}</h2>${!answer && !quizRuntime.revealed ? '<div class="missing-answer-note">У этого вопроса нет подтверждённого ответа в исходных данных.</div>' : ''}${answerBlock}<div class="quiz-controls">${controls}</div></article><p class="quiz-footnote">Самооценка не считается автоматической проверкой правильности: приложение сохраняет только «знаю / не знаю».</p></section>`, `quiz-screen ${quizRuntime.revealed ? 'answer-visible' : ''}`);
    bindRoutes(root);
    const reveal = $('revealQuiz'); if (reveal) reveal.addEventListener('click', () => { quizRuntime.revealed = true; renderQuizPage(); });
    const skip = $('skipQuiz'); if (skip) skip.addEventListener('click', () => nextQuiz(false));
    const next = $('nextQuiz'); if (next) next.addEventListener('click', () => nextQuiz(true));
    root.querySelectorAll('[data-rate]').forEach(btn => btn.addEventListener('click', () => { const value = btn.dataset.rate; state.quizAssessment[q.id] = value; quizRuntime.marked[q.id] = value; saveState(); haptic(value === 'know' ? 'success' : 'light'); renderQuizPage(); }));
  }

  function nextQuiz() { if (quizRuntime.index + 1 >= quizRuntime.items.length) quizRuntime.completed = true; else { quizRuntime.index++; quizRuntime.revealed = false; } renderQuizPage(); }
  function renderQuizSummary(s, all) {
    const values = quizRuntime.items.map(q => quizRuntime.marked[q.id] || 'skip');
    const know = values.filter(x => x === 'know').length, weak = values.filter(x => x === 'weak').length, skip = values.length - know - weak;
    const root = setScreen(`<button class="inline-back" data-route="${parentHash(route)}">← Назад</button><section class="quiz-summary"><div class="summary-icon">✓</div><span class="eyebrow">Квиз завершён</span><h1>${esc(s.name)}</h1><p>Результат — это твоя самооценка, без искусственной автоматической проверки.</p><div class="summary-stats"><div><b>${know}</b><span>Знаю</span></div><div><b>${weak}</b><span>Не знаю</span></div><div><b>${skip}</b><span>Без оценки</span></div></div><div class="summary-actions"><button class="primary-btn" id="restartQuiz">Начать заново</button>${all.some(q => state.quizAssessment[q.id] === 'weak') ? '<button class="secondary-btn" id="weakQuiz">Повторить слабые</button>' : ''}</div></section>`, 'quiz-screen'); bindRoutes(root);
    $('restartQuiz').addEventListener('click', () => { initQuizRuntime(s, route.num, all, false); renderQuizPage(); });
    const weakBtn = $('weakQuiz'); if (weakBtn) weakBtn.addEventListener('click', () => { initQuizRuntime(s, route.num, all, true); renderQuizPage(); });
  }

  function renderSessionHome() {
    const exams = Object.values(data.sessions || {});
    const cards = exams.map(ex => { const st = sessionStats(ex), pct = st.total ? Math.round(st.know / st.total * 100) : 0; const s = getSubject(ex.subjectId); return `<button class="session-card ${s && s.meta ? accentClass[s.meta.accent] || '' : ''}" data-route="#/session/${encodeURIComponent(ex.id)}"><div class="session-card-top"><span class="session-icon">${esc(s && s.meta ? s.meta.icon : '🎯')}</span><div><b>${esc(ex.name)}</b><small>${esc(ex.kind)} · ${st.total} вопросов</small></div><i>→</i></div><p>${esc(ex.description || '')}</p><div class="progress"><i style="width:${pct}%"></i></div><div class="session-stats"><span>Учу: ${st.learning}</span><strong>Знаю: ${st.know}/${st.total}</strong></div></button>`; }).join('');
    const totalQ = exams.reduce((n, e) => n + (e.questions || []).length, 0);
    const root = setScreen(`<section class="page-hero"><span class="hero-symbol">🎯</span><div><span class="eyebrow">Подготовка</span><h1>Сессия</h1><p>${exams.length} дисциплин · ${totalQ} вопросов из исходных документов.</p></div></section><section class="session-grid">${cards || '<div class="empty-state"><b>Списков вопросов нет</b></div>'}</section>`, 'session-screen'); bindRoutes(root);
  }

  function statusLabel(status) { return status === 'know' ? 'Знаю' : status === 'learning' ? 'Учу' : 'Не начинал'; }
  function nextStatus(status) { return status === 'new' ? 'learning' : status === 'learning' ? 'know' : 'new'; }
  function renderSessionExam() {
    const ex = data.sessions && data.sessions[route.id]; if (!ex) { go('#/session'); return; }
    const stats = sessionStats(ex), s = getSubject(ex.subjectId);
    const rows = (ex.questions || []).map(q => { const st = getStatus(ex, q); return `<article class="session-question" data-status="${st}" data-search="${esc((q.text || '').toLowerCase())}"><span class="session-qnum">${q.displayN || q.n}</span><div class="session-qcopy">${q.unit ? `<small>${esc(q.unit)}${q.theme ? ' · ' + esc(q.theme) : ''}</small>` : ''}<p>${esc(q.text)}</p>${q.lecture ? `<button class="lecture-link" data-route="#/lecture/${encodeURIComponent(q.lecture.subjectId)}/${q.lecture.num}">Связанная лекция →</button>` : ''}</div><div class="session-qactions"><button class="status-btn ${st}" data-status-cycle="${q.n}" title="Изменить статус">${statusLabel(st)}</button><button class="train-one" data-train-one="${q.n}" title="Тренировать этот вопрос">▶</button></div></article>`; }).join('');
    const root = setScreen(`<button class="inline-back" data-route="#/session">← Все дисциплины</button><section class="session-detail-hero ${s && s.meta ? accentClass[s.meta.accent] || '' : ''}"><div class="session-detail-title"><span class="session-icon">${esc(s && s.meta ? s.meta.icon : '🎯')}</span><div><span class="eyebrow">${esc(ex.kind)}</span><h1>${esc(ex.name)}</h1><p>${stats.total} вопросов · знаю ${stats.know} · учу ${stats.learning}</p></div></div><div class="session-hero-actions"><button class="primary-btn" data-route="#/session/${encodeURIComponent(ex.id)}/train">Тренировка</button><button class="secondary-btn" data-route="#/session/${encodeURIComponent(ex.id)}/random">Случайный вопрос</button></div></section><section class="session-toolbar"><div class="search-field"><span>⌕</span><input id="sessionSearch" type="search" placeholder="Поиск по вопросам" autocomplete="off"></div><div class="filter-chips"><button data-filter="all" class="active">Все</button><button data-filter="new">Не начинал</button><button data-filter="learning">Учу</button><button data-filter="know">Знаю</button></div></section><div class="session-list" id="sessionList">${rows || '<div class="empty-state"><b>Вопросов нет</b></div>'}</div>`, 'session-detail-screen');
    bindRoutes(root);
    let filter = 'all', search = '';
    const applyFilter = () => root.querySelectorAll('.session-question').forEach(row => { const matchStatus = filter === 'all' || row.dataset.status === filter; const matchSearch = !search || row.dataset.search.includes(search); row.hidden = !(matchStatus && matchSearch); });
    $('sessionSearch').addEventListener('input', e => { search = e.target.value.trim().toLowerCase(); applyFilter(); });
    root.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => { filter = btn.dataset.filter; root.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === btn)); applyFilter(); }));
    root.querySelectorAll('[data-status-cycle]').forEach(btn => btn.addEventListener('click', () => { const q = (ex.questions || []).find(x => Number(x.n) === Number(btn.dataset.statusCycle)); if (!q) return; const ns = nextStatus(getStatus(ex, q)); setStatus(ex, q, ns); btn.className = `status-btn ${ns}`; btn.textContent = statusLabel(ns); btn.closest('.session-question').dataset.status = ns; haptic(ns === 'know' ? 'success' : 'light'); applyFilter(); }));
    root.querySelectorAll('[data-train-one]').forEach(btn => btn.addEventListener('click', () => { const q = (ex.questions || []).find(x => Number(x.n) === Number(btn.dataset.trainOne)); if (!q) return; go(`#/session/${encodeURIComponent(ex.id)}/one/${encodeURIComponent(q.n)}`); }));
  }

  function ensureSessionRuntime(ex, mode, qn) {
    const key = `${ex.id}:${mode}:${qn == null ? '' : qn}`;
    if (sessionRuntime && sessionRuntime.key === key) return;
    const items = shuffle(ex.questions || []);
    let selected = items;
    if (mode === 'random') selected = items.slice(0, 1);
    if (mode === 'one') {
      const exact = (ex.questions || []).find(x => Number(x.n) === Number(qn));
      selected = exact ? [exact] : [];
    }
    sessionRuntime = { key, examId: ex.id, items: selected, index: 0, revealed: false, single: mode !== 'all' };
  }
  function renderSessionTraining() {
    const ex = data.sessions && data.sessions[route.id]; if (!ex) { go('#/session'); return; }
    const mode = route.name === 'sessionRandom' ? 'random' : route.name === 'sessionOne' ? 'one' : 'all';
    ensureSessionRuntime(ex, mode, route.qn);
    if (!sessionRuntime.items.length) { const root = setScreen(`<button class="inline-back" data-route="#/session/${encodeURIComponent(ex.id)}">← К вопросам</button><div class="empty-state large"><b>Нет вопросов для тренировки</b></div>`, 'session-train-screen'); bindRoutes(root); return; }
    if (sessionRuntime.index >= sessionRuntime.items.length) { const root = setScreen(`<button class="inline-back" data-route="#/session/${encodeURIComponent(ex.id)}">← К вопросам</button><section class="quiz-summary"><div class="summary-icon">✓</div><span class="eyebrow">Тренировка завершена</span><h1>${esc(ex.name)}</h1><p>Статусы «учу / знаю» сохранены.</p><div class="summary-actions"><button class="primary-btn" id="restartSession">Начать заново</button><button class="secondary-btn" data-route="#/session/${encodeURIComponent(ex.id)}">К списку</button></div></section>`, 'session-train-screen'); bindRoutes(root); $('restartSession').addEventListener('click', () => { sessionRuntime = null; ensureSessionRuntime(ex, mode, route.qn); renderSessionTraining(); }); return; }
    const q = sessionRuntime.items[sessionRuntime.index], st = getStatus(ex, q), answer = q.answer || null;
    const pct = Math.round((sessionRuntime.index / sessionRuntime.items.length) * 100);
    const answerHtml = sessionRuntime.revealed && answer ? `<div class="answer-panel"><div class="answer-label">Ответ из исходных данных</div><div class="answer-text">${sanitizeHtml(answer, 'rich')}</div></div>` : '';
    const root = setScreen(`<button class="inline-back" data-route="#/session/${encodeURIComponent(ex.id)}">← К вопросам</button><section class="training-shell"><div class="quiz-head"><div><span class="eyebrow">${sessionRuntime.single ? 'Случайный вопрос' : 'Тренировка'}</span><h1>${esc(ex.name)}</h1></div><span class="quiz-mode">${sessionRuntime.index + 1}/${sessionRuntime.items.length}</span></div><div class="progress"><i style="width:${pct}%"></i></div><article class="quiz-card session-training-card"><div class="quiz-number">${q.displayN || q.n}</div>${q.unit ? `<div class="question-context">${esc(q.unit)}${q.theme ? ' · ' + esc(q.theme) : ''}</div>` : ''}<h2>${esc(q.text)}</h2>${answer ? (sessionRuntime.revealed ? answerHtml : '<button class="primary-btn wide" id="revealSession">Показать ответ</button>') : '<div class="answer-panel missing"><div class="answer-label">Подтверждённого ответа нет</div><p>Исходный список содержит вопрос, но не содержит готового ответа. Приложение ничего не придумывает.</p></div>'}${q.lecture ? `<button class="lecture-link-card" data-route="#/lecture/${encodeURIComponent(q.lecture.subjectId)}/${q.lecture.num}">Открыть связанную лекцию →</button>` : ''}<div class="self-check"><button class="rate-btn weak ${st === 'learning' ? 'active' : ''}" data-session-rate="learning">Учу</button><button class="rate-btn know ${st === 'know' ? 'active' : ''}" data-session-rate="know">Знаю</button></div><button class="secondary-btn wide" id="nextSession">${sessionRuntime.single || sessionRuntime.index + 1 >= sessionRuntime.items.length ? 'Завершить' : 'Следующий →'}</button></article></section>`, 'session-train-screen');
    bindRoutes(root);
    const reveal = $('revealSession'); if (reveal) reveal.addEventListener('click', () => { sessionRuntime.revealed = true; renderSessionTraining(); });
    root.querySelectorAll('[data-session-rate]').forEach(btn => btn.addEventListener('click', () => { setStatus(ex, q, btn.dataset.sessionRate); haptic(btn.dataset.sessionRate === 'know' ? 'success' : 'light'); renderSessionTraining(); }));
    $('nextSession').addEventListener('click', () => { sessionRuntime.index++; sessionRuntime.revealed = false; renderSessionTraining(); });
  }

  function renderMaterials() {
    const subjects = data.subjects || [], selected = route.subjectId;
    const items = (data.materials || []).filter(m => !selected || m.subjectId === selected);
    const chips = `<button class="${!selected ? 'active' : ''}" data-route="#/materials">Все</button>` + subjects.filter(s => (data.materials || []).some(m => m.subjectId === s.id)).map(s => `<button class="${selected === s.id ? 'active' : ''}" data-route="#/materials/${encodeURIComponent(s.id)}">${esc(s.meta && s.meta.short || s.name)}</button>`).join('');
    const cards = items.map(m => { const s = getSubject(m.subjectId); return `<article class="material-card"><div class="file-badge">${esc(m.type || 'FILE')}</div><div class="material-copy"><div class="material-subject">${esc(s ? s.name : 'Материал')}</div><h3>${esc(m.title)}</h3><p>${esc(m.desc || '')}</p></div><div class="material-actions"><button class="secondary-btn" data-open-file="${esc(m.file)}">${m.preview ? 'Просмотреть' : 'Открыть'}</button><a class="ghost-btn" href="${esc(m.file)}" download>Скачать</a></div></article>`; }).join('');
    const root = setScreen(`<section class="page-hero"><span class="hero-symbol">📎</span><div><span class="eyebrow">Исходники</span><h1>Материалы</h1><p>Все полезные PDF, DOC и DOCX из загрузки. Если WebView не умеет показывать формат, файл можно скачать.</p></div></section><div class="material-filters filter-chips">${chips}</div><section class="materials-grid">${cards || '<div class="empty-state"><b>Материалов по фильтру нет</b></div>'}</section>`, 'materials-screen');
    bindRoutes(root);
    root.querySelectorAll('[data-open-file]').forEach(btn => btn.addEventListener('click', () => openMaterial(btn.dataset.openFile)));
  }

  function openMaterial(file) {
    const url = new URL(file, location.href).href;
    if (tg && tg.openLink) { try { tg.openLink(url); return; } catch (e) {} }
    const w = window.open(url, '_blank', 'noopener'); if (!w) location.href = url;
  }

  function splitVocab(text) {
    const idx = text.indexOf(' – ');
    if (idx < 0) return { term: text, translation: '' };
    return { term: text.slice(0, idx), translation: text.slice(idx + 3) };
  }
  function renderEnglishVocabulary() {
    const res = data.englishResources || { vocabularyUnits: [], tables: [] };
    const units = res.vocabularyUnits || [];
    const unitTabs = `<button data-vunit="all" class="active">Все</button>` + units.map((u, i) => `<button data-vunit="${i}">Unit ${i + 1}</button>`).join('');
    const unitHtml = units.map((u, ui) => `<section class="vocab-unit" data-unit="${ui}"><div class="section-head"><div><span class="eyebrow">Unit ${ui + 1}</span><h2>${esc(u.title)}</h2></div></div>${(u.sections || []).map(sec => `<div class="vocab-section"><h3>${esc(sec.title)}</h3><div class="vocab-list">${(sec.items || []).map(item => { if (item.type === 'note') return `<div class="vocab-note" data-vtext="${esc(item.text.toLowerCase())}">${esc(item.text)}</div>`; const p = splitVocab(item.text); return `<article class="vocab-entry" data-vtext="${esc(item.text.toLowerCase())}"><b>${esc(p.term)}</b>${p.translation ? `<span>${esc(p.translation)}</span>` : ''}</article>`; }).join('')}</div></div>`).join('')}</section>`).join('');
    const tables = (res.tables || []).map(t => `<details class="vocab-table"><summary>${esc(t.title)}</summary><div class="table-scroll"><table><tbody>${(t.rows || []).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`).join('');
    const root = setScreen(`<button class="inline-back" data-route="#/subject/${encodeURIComponent('английский-язык')}">← Английский язык</button><section class="page-hero"><span class="hero-symbol">ABC</span><div><span class="eyebrow">English mode</span><h1>Vocabulary</h1><p>Лексика Units 1–4, транскрипция, переводы, примеры и таблицы из исходного DOCX.</p></div></section><div class="english-mode-tabs"><button class="active">Vocabulary</button><button data-route="#/session/english">Questions</button><button data-route="#/lecture/${encodeURIComponent('английский-язык')}/1">Lecture</button><button data-route="#/materials/${encodeURIComponent('английский-язык')}">Materials</button></div><section class="vocab-toolbar"><div class="search-field"><span>⌕</span><input id="vocabSearch" type="search" placeholder="Поиск слова или перевода"></div><div class="filter-chips" id="vocabTabs">${unitTabs}</div></section><div id="vocabUnits">${unitHtml || '<div class="empty-state"><b>Лексики в источнике нет</b></div>'}</div>${tables ? `<div class="section-head"><div><span class="eyebrow">Таблицы</span><h2>Сравнения и схемы из DOCX</h2></div></div><div class="vocab-tables">${tables}</div>` : ''}`, 'vocab-screen');
    bindRoutes(root);
    let selected = 'all', query = '';
    const apply = () => {
      root.querySelectorAll('.vocab-unit').forEach(unit => {
        const unitVisible = selected === 'all' || unit.dataset.unit === selected;
        let any = false;
        unit.querySelectorAll('[data-vtext]').forEach(row => { const hit = !query || row.dataset.vtext.includes(query); row.hidden = !hit; if (hit) any = true; });
        unit.hidden = !(unitVisible && any);
      });
    };
    $('vocabSearch').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); apply(); });
    root.querySelectorAll('[data-vunit]').forEach(btn => btn.addEventListener('click', () => { selected = btn.dataset.vunit; root.querySelectorAll('[data-vunit]').forEach(b => b.classList.toggle('active', b === btn)); apply(); }));
  }

  function renderSearch() {
    const root = setScreen(`<section class="page-hero"><span class="hero-symbol">⌕</span><div><span class="eyebrow">Глобальный поиск</span><h1>Найти в приложении</h1><p>Поиск по предметам, лекциям, вопросам сессии и материалам.</p></div></section><div class="search-field search-large"><span>⌕</span><input id="globalSearch" type="search" placeholder="Например: предел, матрица, family" autofocus></div><div id="searchResults" class="search-results"><div class="empty-state compact"><span>Начни вводить запрос</span></div></div>`, 'search-screen');
    const input = $('globalSearch'); input.addEventListener('input', runSearch); setTimeout(() => input.focus(), 50);
  }

  function runSearch() {
    const q = ($('globalSearch').value || '').trim().toLowerCase(); const out = [];
    if (!q) { $('searchResults').innerHTML = '<div class="empty-state compact"><span>Начни вводить запрос</span></div>'; return; }
    (data.subjects || []).forEach(s => (s.lectures || []).forEach(l => { const cards = getCards(s, l.num); const hay = `${s.name} ${l.title} ${l.summary || ''} ${cards.map(c => stripHtml(c.body)).join(' ')}`.toLowerCase(); if (hay.includes(q)) out.push({ type: 'Лекция', title: l.title, meta: s.name, route: `#/lecture/${encodeURIComponent(s.id)}/${l.num}` }); }));
    Object.values(data.sessions || {}).forEach(ex => (ex.questions || []).forEach(question => { if ((question.text || '').toLowerCase().includes(q) && out.length < 60) out.push({ type: 'Сессия', title: question.text, meta: ex.name, route: `#/session/${encodeURIComponent(ex.id)}` }); }));
    (data.materials || []).forEach(m => { if (`${m.title} ${m.desc || ''}`.toLowerCase().includes(q)) out.push({ type: m.type, title: m.title, meta: getSubject(m.subjectId)?.name || 'Материал', route: `#/materials/${encodeURIComponent(m.subjectId || '')}` }); });
    $('searchResults').innerHTML = out.length ? out.slice(0, 50).map(r => `<button class="search-result" data-route="${r.route}"><span>${esc(r.type)}</span><div><b>${esc(r.title)}</b><small>${esc(r.meta)}</small></div><i>→</i></button>`).join('') : '<div class="empty-state compact"><b>Ничего не найдено</b><span>Попробуй другой запрос.</span></div>';
    bindRoutes($('searchResults'));
  }

  function renderSettings() {
    const scheme = state.scheme;
    const paletteCards = palettes.map(p => `<button class="palette-option ${state.palette === p.id ? 'active' : ''}" data-palette="${p.id}"><span class="palette-swatch" style="--sw1:${p.dark[6]};--sw2:${p.dark[7]}"><i></i><i></i></span><b>${esc(p.name)}</b></button>`).join('');
    const fontCards = fonts.map(f => `<button class="font-option ${state.font === f.id ? 'active' : ''}" data-font="${f.id}" style="font-family:${f.stack.replace(/"/g, '&quot;')}"><b>${esc(f.name)}</b><span>${esc(f.sample)}</span></button>`).join('');
    const root = setScreen(`<section class="page-hero"><span class="hero-symbol">⚙</span><div><span class="eyebrow">Персонализация</span><h1>Настройки</h1><p>Все параметры сохраняются локально на устройстве.</p></div></section><section class="settings-panel"><div class="setting-block"><div class="setting-title"><div><h2>Режим</h2><p>Светлый, тёмный или системный.</p></div></div><div class="segmented"><button data-scheme="auto" class="${scheme === 'auto' ? 'active' : ''}">Системный</button><button data-scheme="light" class="${scheme === 'light' ? 'active' : ''}">Светлый</button><button data-scheme="dark" class="${scheme === 'dark' ? 'active' : ''}">Тёмный</button></div></div><div class="setting-block"><div class="setting-title"><div><h2>Цветовая тема</h2><p>12 палитр, каждая работает в светлом и тёмном режиме.</p></div></div><div class="palette-grid">${paletteCards}</div></div><div class="setting-block"><div class="setting-title"><div><h2>Шрифт</h2><p>Безопасные системные fallback-варианты.</p></div></div><div class="font-grid">${fontCards}</div></div><div class="setting-block"><div class="setting-title"><div><h2>Размер текста</h2><p>Для лекций и интерфейса.</p></div><strong id="fontSizeOut">${state.fs}px</strong></div><input id="fontSizeRange" class="range" type="range" min="14" max="22" step="1" value="${state.fs}"></div><div class="setting-block"><div class="setting-title"><div><h2>Межстрочный интервал</h2><p>Комфорт чтения длинных лекций.</p></div><strong id="lineOut">${state.lineHeight.toFixed(2)}</strong></div><input id="lineRange" class="range" type="range" min="1.45" max="2" step="0.05" value="${state.lineHeight}"></div><div class="setting-block"><div class="setting-title"><div><h2>Ширина чтения</h2><p>На desktop формулы и таблицы могут быть шире текста.</p></div></div><div class="segmented"><button data-width="narrow" class="${state.readerWidth === 'narrow' ? 'active' : ''}">Узкая</button><button data-width="normal" class="${state.readerWidth === 'normal' ? 'active' : ''}">Обычная</button><button data-width="wide" class="${state.readerWidth === 'wide' ? 'active' : ''}">Широкая</button></div></div><div class="setting-block danger-zone"><div><h2>Прогресс</h2><p>Сбросит отметки лекций, статусы сессии и самооценки квизов. Оформление останется.</p></div><button class="danger-btn" id="resetProgress">Сбросить прогресс</button></div></section>`, 'settings-screen');
    root.querySelectorAll('[data-scheme]').forEach(btn => btn.addEventListener('click', () => { state.scheme = btn.dataset.scheme; applyAppearance(); saveState(); renderSettings(); }));
    root.querySelectorAll('[data-palette]').forEach(btn => btn.addEventListener('click', () => { state.palette = btn.dataset.palette; applyAppearance(); saveState(); renderSettings(); }));
    root.querySelectorAll('[data-font]').forEach(btn => btn.addEventListener('click', () => { state.font = btn.dataset.font; applyAppearance(); saveState(); renderSettings(); }));
    $('fontSizeRange').addEventListener('input', e => { state.fs = Number(e.target.value); $('fontSizeOut').textContent = `${state.fs}px`; applyAppearance(); saveState(); });
    $('lineRange').addEventListener('input', e => { state.lineHeight = Number(e.target.value); $('lineOut').textContent = state.lineHeight.toFixed(2); applyAppearance(); saveState(); });
    root.querySelectorAll('[data-width]').forEach(btn => btn.addEventListener('click', () => { state.readerWidth = btn.dataset.width; applyAppearance(); saveState(); renderSettings(); }));
    $('resetProgress').addEventListener('click', () => { state.done = {}; state.sessionStatus = {}; state.quizAssessment = {}; saveState(); haptic('light'); showToast('Прогресс сброшен'); renderSettings(); });
  }

  function bindRoutes(root) { (root || document).querySelectorAll('[data-route]').forEach(el => { if (el.dataset.routeBound) return; el.dataset.routeBound = '1'; el.addEventListener('click', e => { e.preventDefault(); go(el.dataset.route); closeDrawer(); }); }); }

  function openDrawer() { const d = $('drawer'); d.classList.remove('hidden'); d.setAttribute('aria-hidden', 'false'); document.body.classList.add('drawer-open'); }
  function closeDrawer() { const d = $('drawer'); d.classList.add('hidden'); d.setAttribute('aria-hidden', 'true'); document.body.classList.remove('drawer-open'); }

  function init() {
    applyAppearance(); initTelegram();
    $('leftBtn').addEventListener('click', () => { if (route.name === 'home') openDrawer(); else go(parentHash(route)); });
    $('searchBtn').addEventListener('click', () => go('#/search'));
    $('drawerShade').addEventListener('click', closeDrawer); $('drawerClose').addEventListener('click', closeDrawer);
    bindRoutes(document);
    window.addEventListener('hashchange', render);
    window.addEventListener('resize', updateViewportVars, { passive: true });
    document.addEventListener('keydown', e => {
      const target = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (e.key === 'Escape' && focusMode) { e.preventDefault(); setFocusMode(false, true); return; }
      if (e.key === '/' && !['input','textarea','select'].includes(target) && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); go('#/search'); }
    });
    window.addEventListener('mathjax-ready', () => { if (currentMathRoot) MathRenderer.render(currentMathRoot); });
    if (window.matchMedia) { const mq = window.matchMedia('(prefers-color-scheme: light)'); if (mq.addEventListener) mq.addEventListener('change', () => { if (state.scheme === 'auto') { applyAppearance(); render(); } }); }
    render();
    if (new URLSearchParams(location.search).has('qa')) window.__KONSP_QA__ = { getState: () => JSON.parse(JSON.stringify(state)), getRoute: () => ({ ...route }), getData: () => data, go, setFocusMode, getFocusMode: () => focusMode, mathFallback: t => MathRenderer.fallback(t), mathNormalize: t => MathRenderer.normalize(t) };
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
