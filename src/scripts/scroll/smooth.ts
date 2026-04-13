// Lenis スムーズスクロール
// requestAnimationFrame で Lenis を駆動し、CSS の scroll を補間する

import Lenis from 'lenis';

import { isReducedMotion } from '../../lib/motion';

export type SmoothScrollHandle = {
  lenis: Lenis;
  dispose(): void;
};

export function initSmoothScroll(): SmoothScrollHandle | null {
  if (isReducedMotion()) return null;

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t: number): number => Math.min(1, 1.001 - 2 ** (-10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5,
    wheelMultiplier: 1,
  });

  let raf = 0;
  const tick = (time: number): void => {
    lenis.raf(time);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    lenis,
    dispose(): void {
      cancelAnimationFrame(raf);
      lenis.destroy();
    },
  };
}
