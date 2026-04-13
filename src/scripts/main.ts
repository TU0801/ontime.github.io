// Entry point - すべての初期化をここから
// 元: index.html L848-1637

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
import { initWebGLRenderer } from './webgl/renderer';

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

window.addEventListener('load', () => {
  setTimeout(() => {
    const canvas = document.getElementById('tech-canvas');
    if (canvas instanceof HTMLCanvasElement) {
      const handle = initWebGLRenderer(canvas);
      if (handle) {
        canvas.classList.add('visible');
        return;
      }
    }
    // WebGL 非対応 → Canvas 2D fallback
    initCanvasBackground();
  }, 200);
});
