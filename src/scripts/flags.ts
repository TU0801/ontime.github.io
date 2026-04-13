// グローバル状態フラグ

export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export function applyTouchDeviceFlag(): void {
  if (isTouchDevice) document.documentElement.classList.add('touch-device');
}

export function initFontLoading(): void {
  // @fontsource 経由でバンドル済み。document.fonts.ready で全フォントロード完了を待つ
  document.fonts.ready.then(() => {
    document.documentElement.classList.add('fonts-loaded');
  });
}
