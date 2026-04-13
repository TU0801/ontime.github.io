// Entry point - すべての初期化をここから
// Canvas 起動は: prefers-reduced-motion → 静止画 / WebGL 対応 → WebGL / 非対応 → Canvas 2D

import { isReducedMotion, subscribeReducedMotion } from '../lib/motion';
import { initCanvasBackground } from './canvas-bg';
import { initCounters } from './counters';
import { initCustomCursor, initMagneticElements } from './cursor';
import { applyTouchDeviceFlag, initFontLoading } from './flags';
import { initInkFx } from './ink-fx';
import { initModal } from './modal';
import { initSectionObservers } from './observers';
import {
  enhanceHeader,
  initCTAGlow,
  initHeroParallaxFallback,
  initScrollProgressFallback,
} from './scroll-fallback';
import { detectInitialTier, startFPSMonitor } from './webgl/quality';
import { initWebGLRenderer, type WebGLHandle } from './webgl/renderer';

function initAfterPaint(): void {
  enhanceHeader();
  initSectionObservers();
  initHeroParallaxFallback();
  initScrollProgressFallback();
  initCTAGlow();
}

applyTouchDeviceFlag();
initFontLoading();

document.addEventListener('DOMContentLoaded', () => {
  initModal();
  initCustomCursor();
  initMagneticElements();
  initCounters();
  initInkFx();
});

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(initAfterPaint, { timeout: 100 });
} else {
  setTimeout(initAfterPaint, 50);
}

// === Canvas 起動: WebGL 優先 + tier 判定 + reduced-motion 尊重 + Canvas 2D fallback ===
let webglHandle: WebGLHandle | null = null;
let stopFps: (() => void) | null = null;
let canvas2dStarted = false;

function bootCanvas(): void {
  if (isReducedMotion()) return; // 静止画モード（描画なし）

  const canvas = document.getElementById('tech-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const tier = detectInitialTier();
  webglHandle = initWebGLRenderer(canvas, { tier });

  if (!webglHandle) {
    // WebGL 非対応 → Canvas 2D
    if (!canvas2dStarted) {
      initCanvasBackground();
      canvas2dStarted = true;
    }
    return;
  }

  canvas.classList.add('visible');

  // FPS 監視（低 FPS が 3 秒連続したら警告。Phase 1-C 後半で動的ダウングレード予定）
  stopFps = startFPSMonitor(
    () => undefined,
    () => {
      console.warn('[webgl] FPS low for 3 consecutive seconds, tier:', tier);
    },
  );
}

window.addEventListener('load', () => {
  setTimeout(bootCanvas, 200);
});

// reduced-motion 動的変化に対応（OS 設定変更で WebGL を止める / 再起動）
subscribeReducedMotion((reduced) => {
  if (reduced && webglHandle) {
    webglHandle.dispose();
    webglHandle = null;
    if (stopFps) {
      stopFps();
      stopFps = null;
    }
  } else if (!reduced && !webglHandle && !canvas2dStarted) {
    bootCanvas();
  }
});
