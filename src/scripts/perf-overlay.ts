// FPS / quality tier / particle / canvas 本数を表示する dev-aesthetic オーバーレイ。
// デフォルト非表示。localStorage フラグ or ⌃⇧P / Ctrl+Shift+P で開閉。
// Command Palette にも「パフォーマンス表示切替」を登録できるよう、
// トグル関数を window に公開する。

import { sampleAudioFeatures } from './audio/analyser';
import { sampleScrollFeatures } from './scroll/scroll-state';
import type { QualityTier } from './webgl/quality';

const STORAGE_KEY = 'onclik:perf-overlay';

export type PerfInfo = {
  tier: QualityTier | 'unknown';
  particleCount: number;
  canvasCount: number;
};

let lastInfo: PerfInfo = { tier: 'unknown', particleCount: 0, canvasCount: 0 };

export function setPerfInfo(info: PerfInfo): void {
  lastInfo = info;
}

function createOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.id = 'perf-overlay';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="row"><span class="k">FPS</span><span class="v" data-v="fps">--</span></div>
    <div class="row"><span class="k">TIER</span><span class="v" data-v="tier">--</span></div>
    <div class="row"><span class="k">PRTL</span><span class="v" data-v="particles">--</span></div>
    <div class="row"><span class="k">CVS</span><span class="v" data-v="canvas">--</span></div>
    <div class="row"><span class="k">SCR</span><span class="v" data-v="scroll">0%</span></div>
    <div class="row"><span class="k">AUD</span><span class="v" data-v="audio">--</span></div>
  `;
  document.body.appendChild(el);
  return el;
}

function injectStyles(): void {
  if (document.getElementById('perf-overlay-styles')) return;
  const style = document.createElement('style');
  style.id = 'perf-overlay-styles';
  style.textContent = `
    #perf-overlay {
      position: fixed; bottom: 16px; right: 16px;
      z-index: 150;
      background: rgba(15,17,21,0.82);
      border: 1px solid rgba(232,230,225,0.12);
      color: #E8E6E1;
      font: 11px/1.5 ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
      letter-spacing: 0.05em;
      padding: 8px 12px;
      border-radius: 8px;
      backdrop-filter: blur(8px);
      display: none;
      min-width: 148px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.35);
      pointer-events: none;
    }
    #perf-overlay.visible { display: block; }
    #perf-overlay .row {
      display: flex; justify-content: space-between; gap: 14px;
      padding: 1px 0;
    }
    #perf-overlay .k { color: #6B7885; font-weight: 700; }
    #perf-overlay .v { color: #E8E6E1; text-align: right; font-variant-numeric: tabular-nums; }
    #perf-overlay .v[data-ok="bad"] { color: #E86A5C; }
    #perf-overlay .v[data-ok="warn"] { color: #F3B955; }
    #perf-overlay .v[data-ok="good"] { color: #7BD389; }
  `;
  document.head.appendChild(style);
}

export function togglePerfOverlay(): boolean {
  const el = document.getElementById('perf-overlay');
  if (!el) return false;
  const active = !el.classList.contains('visible');
  el.classList.toggle('visible', active);
  try {
    localStorage.setItem(STORAGE_KEY, active ? '1' : '0');
  } catch {
    // ignore storage failure
  }
  return active;
}

export function initPerfOverlay(): (() => void) | undefined {
  if (typeof document === 'undefined') return undefined;

  injectStyles();
  const overlay = createOverlay();

  // 起動時に前回の状態を復元
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      overlay.classList.add('visible');
    }
  } catch {
    // ignore
  }

  const fpsEl = overlay.querySelector<HTMLElement>('[data-v="fps"]');
  const tierEl = overlay.querySelector<HTMLElement>('[data-v="tier"]');
  const prtlEl = overlay.querySelector<HTMLElement>('[data-v="particles"]');
  const cvsEl = overlay.querySelector<HTMLElement>('[data-v="canvas"]');
  const scrEl = overlay.querySelector<HTMLElement>('[data-v="scroll"]');
  const audEl = overlay.querySelector<HTMLElement>('[data-v="audio"]');

  // FPS: rAF 間隔から実測
  let frames = 0;
  let lastT = performance.now();
  let raf = 0;

  const tick = (): void => {
    raf = requestAnimationFrame(tick);
    frames++;
    const now = performance.now();
    if (now - lastT >= 500) {
      const fps = (frames * 1000) / (now - lastT);
      frames = 0;
      lastT = now;

      if (fpsEl) {
        fpsEl.textContent = fps.toFixed(0);
        fpsEl.dataset.ok = fps >= 55 ? 'good' : fps >= 40 ? 'warn' : 'bad';
      }
      if (tierEl) tierEl.textContent = lastInfo.tier;
      if (prtlEl) prtlEl.textContent = lastInfo.particleCount.toString();
      if (cvsEl) cvsEl.textContent = lastInfo.canvasCount.toString();

      const scroll = sampleScrollFeatures();
      if (scrEl) scrEl.textContent = `${(scroll.progress * 100).toFixed(0)}%`;

      const audio = sampleAudioFeatures();
      if (audEl) {
        const active = audio.energy > 0.01;
        audEl.textContent = active ? `${(audio.energy * 100).toFixed(0)}%` : 'off';
        audEl.dataset.ok = active ? 'good' : '';
      }
    }
  };
  raf = requestAnimationFrame(tick);

  const onKeydown = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      togglePerfOverlay();
    }
  };
  document.addEventListener('keydown', onKeydown);

  // window に expose して command palette から呼び出せるように
  (window as unknown as { __togglePerf?: () => void }).__togglePerf = togglePerfOverlay;

  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  };
}
