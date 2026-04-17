// Entry point - すべての初期化をここから
// Canvas: prefers-reduced-motion → 静止画 / WebGL 対応 → flow + particles（別 canvas）/ 非対応 → Canvas 2D

import { isReducedMotion, subscribeReducedMotion } from '../lib/motion';
import { initAmbientToggle } from './audio/toggle';
import { initBrandReveal } from './brand-reveal';
import { initCanvasBackground } from './canvas-bg';
import { initCharPhysics } from './char-physics';
import { initCommandPalette } from './command-palette';
import { initCounters } from './counters';
import { initCustomCursor, initMagneticElements } from './cursor';
import { initDepthParallax } from './depth-parallax';
import { applyTouchDeviceFlag, initFontLoading } from './flags';
import { initInkFx } from './ink-fx';
import { initKeyboardNav } from './keyboard-nav';
import { initLabsExplorer } from './labs-explorer';
import { initModal } from './modal';
import { initSectionObservers } from './observers';
import { initPerfOverlay, setPerfInfo } from './perf-overlay';
import { initScrollAnimations } from './scroll/scroll-anim';
import { initSmoothScroll } from './scroll/smooth';
import {
  enhanceHeader,
  initCTAGlow,
  initHeroParallaxFallback,
  initScrollProgressFallback,
} from './scroll-fallback';
import { initVariableFontMotion } from './variable-font';
import { type HeroRippleHandle, initHeroRipple } from './webgl/hero-ripple';
import { initLabsCanvas, type LabsHandle } from './webgl/labs-canvas';
import { initParticleField, type ParticleHandle } from './webgl/particles';
import { detectInitialTier, startFPSMonitor } from './webgl/quality';
import { initWebGLRenderer, type WebGLHandle } from './webgl/renderer';
import { initRibbonTrail, type RibbonHandle } from './webgl/ribbon-trail';

function initAfterPaint(): void {
  enhanceHeader();
  initSectionObservers();
  initHeroParallaxFallback();
  initScrollProgressFallback();
  initCTAGlow();
}

applyTouchDeviceFlag();
initFontLoading();

// View Transitions (ClientRouter) 有効下で DOMContentLoaded は初回しか発火しないため、
// astro:page-load にバインドして、最初の読み込みと SPA ナビゲーション戻り両方で動く。
// main.ts は index.astro の script からしか import されないが、listener は module-level
// で登録されるので navigation 後に /check でも発火する。#hero-root で index 限定にガード。
const isIndexPage = (): boolean => !!document.querySelector('.hero');

let disposeParallax: (() => void) | undefined;
let disposeCharPhysics: (() => void) | undefined;
let disposeCmdK: (() => void) | undefined;
let disposeFontMotion: (() => void) | undefined;
let disposePerf: (() => void) | undefined;
let disposeReveal: (() => void) | undefined;
let disposeKbNav: (() => void) | undefined;
let disposeLabsExplorer: (() => void) | undefined;

const initPerPage = (): void => {
  if (!isIndexPage()) return;
  initModal();
  initCustomCursor();
  initMagneticElements();
  initCounters();
  initInkFx();
  initSmoothScroll();
  initScrollAnimations();
  initAmbientToggle();
  disposeParallax?.();
  disposeParallax = initDepthParallax() ?? undefined;
  disposeCharPhysics?.();
  disposeCharPhysics = initCharPhysics() ?? undefined;
  disposeCmdK?.();
  disposeCmdK = initCommandPalette() ?? undefined;
  disposeFontMotion?.();
  disposeFontMotion = initVariableFontMotion() ?? undefined;
  disposePerf?.();
  disposePerf = initPerfOverlay() ?? undefined;
  disposeReveal?.();
  disposeReveal = initBrandReveal() ?? undefined;
  disposeKbNav?.();
  disposeKbNav = initKeyboardNav() ?? undefined;
  // Labs explorer は labs-canvas が起動済みであることを前提とするので、少し遅延
  setTimeout(() => {
    disposeLabsExplorer?.();
    disposeLabsExplorer = initLabsExplorer() ?? undefined;
  }, 600);
};

document.addEventListener('astro:page-load', () => {
  initPerPage();
  if (!isIndexPage()) return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(initAfterPaint, { timeout: 100 });
  } else {
    setTimeout(initAfterPaint, 50);
  }
});

// === Canvas 起動: WebGL 優先 + tier 判定 + reduced-motion 尊重 + Canvas 2D fallback ===
let webglHandle: WebGLHandle | null = null;
let particleHandle: ParticleHandle | null = null;
let ribbonHandle: RibbonHandle | null = null;
let heroRippleHandle: HeroRippleHandle | null = null;
let labsHandle: LabsHandle | null = null;
let stopFps: (() => void) | null = null;
let canvas2dStarted = false;

function disposeCanvas(): void {
  webglHandle?.dispose();
  webglHandle = null;
  particleHandle?.dispose();
  particleHandle = null;
  ribbonHandle?.dispose();
  ribbonHandle = null;
  heroRippleHandle?.dispose();
  heroRippleHandle = null;
  labsHandle?.dispose();
  labsHandle = null;
  stopFps?.();
  stopFps = null;
  canvas2dStarted = false;
}

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

  // 別 canvas で GPU パーティクルを起動（OGL の uniform 衝突回避）
  const particlesCanvas = document.getElementById('particles-canvas');
  let particleCount = 0;
  if (particlesCanvas instanceof HTMLCanvasElement) {
    particleCount = tier === 'high' ? 5000 : tier === 'medium' ? 2500 : 1000;
    const pointSize = tier === 'high' ? 7 : tier === 'medium' ? 8 : 9;
    particleHandle = initParticleField(particlesCanvas, particleCount, pointSize);
  }

  // 独立 canvas で cursor ribbon trail を起動（タッチ端末では初期化しない）
  const trailCanvas = document.getElementById('trail-canvas');
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  if (!isTouch && trailCanvas instanceof HTMLCanvasElement) {
    ribbonHandle = initRibbonTrail(trailCanvas);
  }

  // Hero 背面に ink-pool ripple plane を起動
  const heroRippleCanvas = document.getElementById('hero-ripple-canvas');
  if (heroRippleCanvas instanceof HTMLCanvasElement) {
    heroRippleHandle = initHeroRipple(heroRippleCanvas);
  }

  // Labs セクションの generative art
  const labsCanvas = document.getElementById('labs-canvas');
  if (labsCanvas instanceof HTMLCanvasElement) {
    labsHandle = initLabsCanvas(labsCanvas);
  }

  // FPS 監視（低 FPS が 3 秒連続したら警告）
  stopFps = startFPSMonitor(
    () => undefined,
    () => {
      console.warn('[webgl] FPS low for 3 consecutive seconds, tier:', tier);
    },
  );

  // Perf overlay に現在の構成を通知
  const canvasCount = [
    canvas,
    particlesCanvas,
    document.getElementById('trail-canvas'),
    document.getElementById('hero-ripple-canvas'),
    document.getElementById('labs-canvas'),
  ].filter((c): c is HTMLCanvasElement => c instanceof HTMLCanvasElement).length;
  setPerfInfo({ tier, particleCount, canvasCount });
}

// View Transitions の swap 前にリソースを解放して、ナビゲーション後に新しい canvas で再起動
document.addEventListener('astro:before-swap', () => {
  disposeCanvas();
  disposeParallax?.();
  disposeParallax = undefined;
  disposeCharPhysics?.();
  disposeCharPhysics = undefined;
  disposeCmdK?.();
  disposeCmdK = undefined;
  disposeFontMotion?.();
  disposeFontMotion = undefined;
  disposePerf?.();
  disposePerf = undefined;
  disposeReveal?.();
  disposeReveal = undefined;
  disposeKbNav?.();
  disposeKbNav = undefined;
  disposeLabsExplorer?.();
  disposeLabsExplorer = undefined;
});
document.addEventListener('astro:page-load', () => {
  // 初回は load イベント相当、SPA ナビ後もここを通る
  if (!isIndexPage()) return; // /check 側は独自 Canvas を使うので起動しない
  setTimeout(bootCanvas, 120);
});

// reduced-motion 動的変化に対応
subscribeReducedMotion((reduced) => {
  if (reduced && webglHandle) {
    webglHandle.dispose();
    webglHandle = null;
    if (particleHandle) {
      particleHandle.dispose();
      particleHandle = null;
    }
    if (ribbonHandle) {
      ribbonHandle.dispose();
      ribbonHandle = null;
    }
    if (stopFps) {
      stopFps();
      stopFps = null;
    }
  } else if (!reduced && !webglHandle && !canvas2dStarted) {
    bootCanvas();
  }
});
