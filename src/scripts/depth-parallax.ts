// マウス追従の 3D parallax
// - Hero content: マウスの逆方向に軽く translate + tilt（奥行き感）
// - Bento card: 各カードが自身中心を軸にマウスへ向かって tilt
// reduced-motion / touch では起動しない。

import { isTouchDevice, prefersReducedMotion } from './flags';

const MAX_HERO_TRANSLATE = 14; // px
const MAX_HERO_TILT = 2.2; // degrees
const MAX_BENTO_TILT = 7.5; // degrees
const BENTO_PERSPECTIVE = 900; // px
const LERP = 0.12;

export function initDepthParallax(): (() => void) | undefined {
  if (isTouchDevice || prefersReducedMotion) return undefined;

  const hero = document.querySelector<HTMLElement>('.hero-content');
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.bento-card'));
  if (!hero && cards.length === 0) return undefined;

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;

  const onMouseMove = (e: MouseEvent): void => {
    mx = e.clientX;
    my = e.clientY;
  };
  window.addEventListener('mousemove', onMouseMove);

  // Hero state（lerp）
  let hx = 0;
  let hy = 0;
  let rx = 0;
  let ry = 0;

  // Bento per-card target state
  type BentoState = { tx: number; ty: number; rx: number; ry: number };
  const bentoStates = cards.map<BentoState>(() => ({ tx: 0, ty: 0, rx: 0, ry: 0 }));

  let raf = 0;
  const tick = (): void => {
    raf = requestAnimationFrame(tick);

    // 画面中央からのオフセットを -1..1 に正規化
    const nx = (mx / window.innerWidth) * 2 - 1;
    const ny = (my / window.innerHeight) * 2 - 1;

    if (hero) {
      // マウス方向と逆に translate、更に tilt
      const targetX = -nx * MAX_HERO_TRANSLATE;
      const targetY = -ny * MAX_HERO_TRANSLATE;
      const targetRx = ny * MAX_HERO_TILT;
      const targetRy = -nx * MAX_HERO_TILT;
      hx += (targetX - hx) * LERP;
      hy += (targetY - hy) * LERP;
      rx += (targetRx - rx) * LERP;
      ry += (targetRy - ry) * LERP;
      hero.style.transform = `translate3d(${hx}px, ${hy}px, 0) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }

    // 各 bento カードはそれぞれの中心を軸に tilt
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const state = bentoStates[i];
      if (!card || !state) continue;
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // カードからみたマウスの相対オフセット（-1..1）
      const dx = (mx - cx) / (rect.width / 2);
      const dy = (my - cy) / (rect.height / 2);
      const limit = 1.5;
      const ndx = Math.max(-limit, Math.min(limit, dx));
      const ndy = Math.max(-limit, Math.min(limit, dy));
      const targetRy = ndx * MAX_BENTO_TILT * 0.8;
      const targetRx = -ndy * MAX_BENTO_TILT * 0.8;
      // 視距離に応じて絞る（カードの外では効果を減衰）
      const dist = Math.hypot(dx, dy);
      const influence = Math.max(0, 1 - dist / 2.5);
      state.rx += (targetRx * influence - state.rx) * LERP;
      state.ry += (targetRy * influence - state.ry) * LERP;
      card.style.transform =
        `perspective(${BENTO_PERSPECTIVE}px) rotateX(${state.rx}deg) rotateY(${state.ry}deg) ` +
        `translate(var(--magnetic-x, 0px), var(--magnetic-y, 0px))`;
    }
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('mousemove', onMouseMove);
    if (hero) hero.style.transform = '';
    for (const card of cards) card.style.transform = '';
  };
}
