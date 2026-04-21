// パワーユーザー向けキーボード UX:
//   j / k           セクションジャンプ（次 / 前）
//   ?               ショートカット一覧トースト
//   Konami (↑↑↓↓←→←→BA)   LAB MODE（body に lab-mode クラス、shader 強度が跳ね上がる）
// command palette と競合しない（⌘K は別で動作）。

const SECTIONS_SELECTOR =
  '.hero, .philosophy, .impact-numbers, .tech-showcase, .case-studies, .labs, .pre-footer-cta';

type Cleanup = () => void;

function scrollToEl(el: Element): void {
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function findCurrentSectionIndex(sections: Element[]): number {
  let closest = 0;
  let closestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < sections.length; i++) {
    const rect = sections[i]?.getBoundingClientRect();
    if (!rect) continue;
    const dist = Math.abs(rect.top);
    if (dist < closestDist) {
      closestDist = dist;
      closest = i;
    }
  }
  return closest;
}

function showToast(message: string, ms = 2200): void {
  let toast = document.getElementById('kb-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'kb-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.innerHTML = message;
  toast.classList.add('visible');
  setTimeout(() => toast?.classList.remove('visible'), ms);
}

function injectStyles(): void {
  if (document.getElementById('kb-nav-styles')) return;
  const style = document.createElement('style');
  style.id = 'kb-nav-styles';
  style.textContent = `
    #kb-toast {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%) translateY(16px);
      z-index: 180;
      background: rgba(15,17,21,0.92);
      border: 1px solid rgba(232,230,225,0.12);
      color: #E8E6E1;
      padding: 14px 22px;
      border-radius: 10px;
      font: 500 0.88rem/1.5 var(--font-latin-jp);
      letter-spacing: 0.05em;
      box-shadow: 0 14px 35px rgba(0,0,0,0.4);
      backdrop-filter: blur(10px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1);
    }
    #kb-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    #kb-toast kbd {
      display: inline-block;
      padding: 2px 7px;
      margin: 0 3px;
      background: rgba(232,230,225,0.1);
      border: 1px solid rgba(232,230,225,0.18);
      border-radius: 5px;
      font-family: ui-monospace, 'SF Mono', Menlo, monospace;
      font-size: 0.78rem;
      color: #F4F3EE;
    }
    #kb-toast .row { display: flex; justify-content: space-between; gap: 20px; padding: 2px 0; }

    /* LAB MODE: extreme shader intensity + inverted palette badges */
    body.lab-mode {
      --lab-badge: '● LAB MODE';
    }
    body.lab-mode::before {
      content: '● LAB MODE';
      position: fixed;
      top: 12px; left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      padding: 6px 14px;
      background: #1E3A5F;
      color: #F4F3EE;
      font: 900 0.7rem/1 'Montserrat Variable', sans-serif;
      letter-spacing: 0.2em;
      border-radius: 6px;
      border: 1px solid rgba(90,122,148,0.4);
      box-shadow: 0 4px 14px rgba(30,58,95,0.4);
      pointer-events: none;
      animation: lab-pulse 1.8s ease-in-out infinite;
    }
    @keyframes lab-pulse { 0%,100% { opacity: 0.75; } 50% { opacity: 1; } }
  `;
  document.head.appendChild(style);
}

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

export function initKeyboardNav(): Cleanup | undefined {
  injectStyles();

  const konamiBuf: string[] = [];

  const onKey = (e: KeyboardEvent): void => {
    // フォーカスが input / textarea / contenteditable なら無視
    const t = e.target;
    if (t instanceof HTMLElement) {
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
    }

    // Konami buffer
    konamiBuf.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (konamiBuf.length > KONAMI.length) konamiBuf.shift();
    if (konamiBuf.length === KONAMI.length && konamiBuf.every((k, i) => k === KONAMI[i])) {
      const on = document.body.classList.toggle('lab-mode');
      showToast(on ? '<strong>LAB MODE</strong> activated' : 'LAB MODE deactivated', 2600);
      konamiBuf.length = 0;
    }

    // 1 文字ショートカットは Ctrl/Meta/Alt/Shift なしの時だけ
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

    const sections = Array.from(document.querySelectorAll(SECTIONS_SELECTOR));

    if (e.key === 'j' && sections.length > 0) {
      e.preventDefault();
      const idx = Math.min(sections.length - 1, findCurrentSectionIndex(sections) + 1);
      const el = sections[idx];
      if (el) scrollToEl(el);
    } else if (e.key === 'k' && sections.length > 0) {
      e.preventDefault();
      const idx = Math.max(0, findCurrentSectionIndex(sections) - 1);
      const el = sections[idx];
      if (el) scrollToEl(el);
    } else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      e.preventDefault();
      showToast(
        `
        <div class="row"><span><kbd>j</kbd> / <kbd>k</kbd></span><span>次 / 前セクション</span></div>
        <div class="row"><span><kbd>⌘</kbd><kbd>K</kbd></span><span>コマンドパレット</span></div>
        <div class="row"><span><kbd>⌃</kbd><kbd>⇧</kbd><kbd>P</kbd></span><span>パフォーマンス表示</span></div>
        <div class="row"><span><kbd>?</kbd></span><span>このヘルプ</span></div>
        `,
        4200,
      );
    }
  };

  document.addEventListener('keydown', onKey);

  return () => {
    document.removeEventListener('keydown', onKey);
    document.getElementById('kb-toast')?.remove();
    document.body.classList.remove('lab-mode');
  };
}
