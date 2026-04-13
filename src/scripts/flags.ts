// グローバル状態フラグ

export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export function applyTouchDeviceFlag(): void {
  if (isTouchDevice) document.documentElement.classList.add('touch-device');
}

export function initFontLoading(): void {
  if (!('fonts' in document)) return;
  Promise.all([
    document.fonts.load('700 1em Montserrat'),
    document.fonts.load('500 1em "Noto Sans JP"'),
  ]).then(() => {
    document.documentElement.classList.add('fonts-loaded');
  });
}
