// Entry point - すべての初期化をここから
// 元: index.html L848-1637

import { applyTouchDeviceFlag, initFontLoading } from './flags';
import { initCustomCursor, initMagneticElements } from './cursor';
import { initCounters } from './counters';
import { initSectionObservers } from './observers';
import {
  initHeroParallaxFallback,
  initScrollProgressFallback,
  initCTAGlow,
  enhanceHeader,
} from './scroll-fallback';
import { initInkFx } from './ink-fx';
import { initCanvasBackground } from './canvas-bg';
import { initModal } from './modal';

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
  setTimeout(initCanvasBackground, 200);
});
