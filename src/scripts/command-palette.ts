// ⌘K / Ctrl+K で開く Command palette。
// ナビゲーション、トグル（ambient / theme）、セクションジャンプを提供。
// 上下でハイライト移動、Enter で実行、Esc で閉じる。
// Input はインクリメンタル部分一致（ひらがな/英数小文字化）でフィルタ。

type Command = {
  id: string;
  label: string;
  hint?: string;
  keywords: string; // 検索対象の小文字文字列
  icon: string;
  run: () => void;
};

function scrollTo(selector: string): void {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleAmbient(): void {
  const btn = document.getElementById('ambient-toggle');
  if (btn instanceof HTMLButtonElement) btn.click();
}

function toggleTheme(): void {
  document.body.classList.toggle('theme-dark');
}

function buildCommands(): Command[] {
  return [
    {
      id: 'top',
      label: 'トップへ戻る',
      hint: 'g h',
      icon: '⤴',
      keywords: 'top home トップ 戻る',
      run: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    },
    {
      id: 'philosophy',
      label: 'Philosophy',
      hint: 'g p',
      icon: '◉',
      keywords: 'philosophy 哲学 philosophy',
      run: () => scrollTo('.philosophy'),
    },
    {
      id: 'tech',
      label: 'Core Technologies',
      hint: 'g t',
      icon: '◉',
      keywords: 'tech technology コア 技術 core',
      run: () => scrollTo('.tech-showcase'),
    },
    {
      id: 'cases',
      label: 'Case Studies',
      hint: 'g c',
      icon: '◉',
      keywords: 'case studies 事例 cases',
      run: () => scrollTo('.case-studies'),
    },
    {
      id: 'labs',
      label: 'Labs',
      hint: 'g l',
      icon: '◉',
      keywords: 'labs 実験 generative',
      run: () => scrollTo('.labs'),
    },
    {
      id: 'check',
      label: '課題診断へ移動',
      hint: '/check',
      icon: '→',
      keywords: 'check 診断 assessment 課題',
      run: () => {
        window.location.href = '/check';
      },
    },
    {
      id: 'ambient',
      label: '環境音 ON / OFF',
      hint: 'a',
      icon: '♪',
      keywords: 'audio ambient 音 sound mute',
      run: toggleAmbient,
    },
    {
      id: 'theme',
      label: 'ダークモード切替',
      hint: 't',
      icon: '◐',
      keywords: 'theme dark light モード 切替 toggle',
      run: toggleTheme,
    },
    {
      id: 'perf',
      label: 'パフォーマンス表示 切替',
      hint: '⌃⇧P',
      icon: '⟡',
      keywords: 'fps perf performance パフォーマンス debug overlay',
      run: () => {
        const fn = (window as unknown as { __togglePerf?: () => void }).__togglePerf;
        if (typeof fn === 'function') fn();
      },
    },
  ];
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFKC');
}

function filterCommands(cmds: Command[], q: string): Command[] {
  const needle = normalize(q.trim());
  if (!needle) return cmds;
  return cmds.filter((c) => {
    const hay = `${normalize(c.label)} ${c.keywords}`;
    return hay.includes(needle);
  });
}

export function initCommandPalette(): (() => void) | undefined {
  const overlay = document.getElementById('cmdk-overlay');
  const input = document.getElementById('cmdk-input');
  const list = document.getElementById('cmdk-list');
  if (
    !(overlay instanceof HTMLElement) ||
    !(input instanceof HTMLInputElement) ||
    !(list instanceof HTMLElement)
  ) {
    return undefined;
  }

  const commands = buildCommands();
  let filtered = commands;
  let activeIdx = 0;
  let isOpen = false;

  const render = (): void => {
    if (filtered.length === 0) {
      list.innerHTML = '<li class="cmdk-empty">該当するコマンドが見つかりません</li>';
      return;
    }
    list.innerHTML = filtered
      .map(
        (c, i) => `
        <li class="cmdk-item${i === activeIdx ? ' active' : ''}" data-idx="${i}" role="option" aria-selected="${i === activeIdx}">
          <span class="cmdk-item-icon">${c.icon}</span>
          <span class="cmdk-item-label">${c.label}</span>
          ${c.hint ? `<span class="cmdk-item-hint">${c.hint}</span>` : ''}
        </li>`,
      )
      .join('');
  };

  const open = (): void => {
    isOpen = true;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    input.value = '';
    filtered = commands;
    activeIdx = 0;
    render();
    // フォーカスを少し遅延（transition との競合回避）
    setTimeout(() => input.focus(), 50);
  };

  const close = (): void => {
    isOpen = false;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    input.blur();
  };

  const run = (cmd: Command): void => {
    close();
    setTimeout(() => cmd.run(), 160);
  };

  const onKeydown = (e: KeyboardEvent): void => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      isOpen ? close() : open();
      return;
    }
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length > 0) {
        activeIdx = (activeIdx + 1) % filtered.length;
        render();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length > 0) {
        activeIdx = (activeIdx - 1 + filtered.length) % filtered.length;
        render();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[activeIdx];
      if (target) run(target);
    }
  };

  const onInput = (): void => {
    filtered = filterCommands(commands, input.value);
    activeIdx = 0;
    render();
  };

  const onOverlayClick = (e: MouseEvent): void => {
    if (e.target === overlay) close();
  };

  const onListClick = (e: MouseEvent): void => {
    const t = e.target instanceof Element ? e.target.closest('.cmdk-item') : null;
    if (!(t instanceof HTMLElement)) return;
    const idx = Number(t.dataset.idx ?? -1);
    const cmd = filtered[idx];
    if (cmd) run(cmd);
  };

  document.addEventListener('keydown', onKeydown);
  input.addEventListener('input', onInput);
  overlay.addEventListener('click', onOverlayClick);
  list.addEventListener('click', onListClick);
  render();

  return () => {
    document.removeEventListener('keydown', onKeydown);
    input.removeEventListener('input', onInput);
    overlay.removeEventListener('click', onOverlayClick);
    list.removeEventListener('click', onListClick);
  };
}
