// prefers-reduced-motion をリアクティブに扱う共通ユーティリティ
// Phase 1 で WebGL / GSAP / Tone.js の停止・軽量化に使う

const mediaQuery =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

/**
 * 現在 prefers-reduced-motion が reduce に設定されているかを返す。
 * SSR 環境では false。
 */
export function isReducedMotion(): boolean {
  return mediaQuery?.matches ?? false;
}

/**
 * prefers-reduced-motion の変化を購読。
 * 返り値の関数を呼ぶと購読解除。
 */
export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  if (!mediaQuery) return () => {};
  const handler = (e: MediaQueryListEvent): void => {
    callback(e.matches);
  };
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

/**
 * 現在値 + 変更購読のセット。初期コールバックも即時に発火する。
 * WebGL 初期化などで「現状を判定しつつ、OS 設定変更にも追随したい」ケース向け。
 */
export function subscribeReducedMotion(callback: (reduced: boolean) => void): () => void {
  callback(isReducedMotion());
  return onReducedMotionChange(callback);
}
