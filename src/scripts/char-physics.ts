// Hero title の各 .char にダンパ付きスプリング物理を仕込む。
// マウスが近づくと斥力を受けて散り、離れると自然に原点へ戻る。
// brush-wipe アニメーション完了後に駆動を始めるので、ロード時の演出は崩さない。

import { isTouchDevice, prefersReducedMotion } from './flags';

const MOUSE_RADIUS = 160; // px（この半径内に入ると押される）
const MOUSE_FORCE = 1800; // 押し出し強度（バネとの平衡で ~20-25px）
const SPRING_K = 85; // 原点への引き戻し強度
const DAMPING = 0.82; // 速度減衰（低いほど跳ねる）
const MAX_OFFSET = 40; // px（過大な飛び出しを抑える）
const START_DELAY_MS = 2200; // brush-wipe 完了後に起動

type CharState = {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export function initCharPhysics(): (() => void) | void {
  if (isTouchDevice || prefersReducedMotion) return;

  const chars = Array.from(document.querySelectorAll<HTMLElement>('.hero-title .char'));
  if (chars.length === 0) return;

  const states: CharState[] = chars.map((el) => ({ el, x: 0, y: 0, vx: 0, vy: 0 }));

  let mx = -9999;
  let my = -9999;
  const onMouseMove = (e: MouseEvent): void => {
    mx = e.clientX;
    my = e.clientY;
  };
  window.addEventListener('mousemove', onMouseMove);

  let raf = 0;
  let lastT = performance.now();
  let started = false;

  const tick = (): void => {
    raf = requestAnimationFrame(tick);
    if (!started) return;

    const now = performance.now();
    const dt = Math.min(0.033, (now - lastT) / 1000);
    lastT = now;

    for (const s of states) {
      const rect = s.el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // 斥力: マウスから char への方向ベクトル × falloff²
      let fx = 0;
      let fy = 0;
      if (mx > -1000) {
        const dx = cx - mx;
        const dy = cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy + 0.0001);
        if (dist < MOUSE_RADIUS) {
          const falloff = 1 - dist / MOUSE_RADIUS;
          const strength = MOUSE_FORCE * falloff * falloff;
          fx += (dx / dist) * strength;
          fy += (dy / dist) * strength;
        }
      }

      // スプリング: 原点へ戻す
      fx -= SPRING_K * s.x;
      fy -= SPRING_K * s.y;

      // オイラー積分 + 減衰
      s.vx = (s.vx + fx * dt) * DAMPING;
      s.vy = (s.vy + fy * dt) * DAMPING;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // 過大な飛び出しを抑える
      const off = Math.hypot(s.x, s.y);
      if (off > MAX_OFFSET) {
        const k = MAX_OFFSET / off;
        s.x *= k;
        s.y *= k;
      }

      s.el.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)`;
    }
  };
  raf = requestAnimationFrame(tick);

  const startTimer = window.setTimeout(() => {
    started = true;
    lastT = performance.now();
  }, START_DELAY_MS);

  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(startTimer);
    window.removeEventListener('mousemove', onMouseMove);
    for (const s of states) s.el.style.transform = '';
  };
}
