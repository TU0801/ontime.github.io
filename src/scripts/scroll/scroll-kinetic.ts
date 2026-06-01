// Scroll-velocity choreography:
// スクロール速度を root の CSS 変数 --sv（絶対値 0..1）/ --svd（符号付き -1..1）に
// 流し込み、見出しの letter-spacing / skew / wght を慣性的に変形させる。
// 位置ベースの単純フェードでなく「速度反応」の choreography（停止時にゆっくり settle）。
//
// sampleScrollFeatures() は内部で平滑化済み。ここではさらに緩い慣性を掛けて
// 見出し変形が滑らかに収束するようにする。reduced-motion では無効。

import { isReducedMotion } from '../../lib/motion';
import { sampleScrollFeatures } from './scroll-state';

export function initScrollKinetic(): (() => void) | undefined {
  if (typeof document === 'undefined' || isReducedMotion()) return undefined;

  const root = document.documentElement;
  let raf = 0;
  let sv = 0; // smoothed |velocity|
  let svd = 0; // smoothed signed velocity

  const tick = (): void => {
    raf = requestAnimationFrame(tick);
    const s = sampleScrollFeatures();
    sv += (s.abs - sv) * 0.2;
    svd += (s.velocity - svd) * 0.2;
    root.style.setProperty('--sv', sv.toFixed(3));
    root.style.setProperty('--svd', svd.toFixed(3));
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    root.style.removeProperty('--sv');
    root.style.removeProperty('--svd');
  };
}
