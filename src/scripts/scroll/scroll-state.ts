// スクロール状態ブリッジ: window.scrollY を WebGL uniform にまで橋渡し
// Lenis で補間された scrollY をそのまま拾うので、smooth scroll とも協調する。
//
// 返す値:
//   progress  0..1  ページ全体に対するスクロール位置
//   velocity -1..1  直近フレームのスクロール速度（符号は下=正 / 上=負）
//   abs     0..1    velocity の絶対値（強度用途のショートカット）

export type ScrollFeatures = {
  progress: number;
  velocity: number;
  abs: number;
};

const VELOCITY_SCALE = 4; // px/ms → 4 で 1.0（≒ 4000px/s の大振り）
const SMOOTH_PROGRESS = 0.15;
const SMOOTH_VELOCITY = 0.3;

const state: ScrollFeatures = { progress: 0, velocity: 0, abs: 0 };

let lastY = 0;
let lastT = 0;
let initialized = false;

export function sampleScrollFeatures(): ScrollFeatures {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return state;
  }

  const now = performance.now();
  const y = window.scrollY;

  if (!initialized) {
    lastY = y;
    lastT = now;
    initialized = true;
    return state;
  }

  const dt = Math.max(1, now - lastT);
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

  const targetProgress = Math.max(0, Math.min(1, y / maxScroll));
  const rawVelocity = (y - lastY) / dt;
  const targetVelocity = Math.max(-1, Math.min(1, rawVelocity / VELOCITY_SCALE));

  state.progress += (targetProgress - state.progress) * SMOOTH_PROGRESS;
  state.velocity += (targetVelocity - state.velocity) * SMOOTH_VELOCITY;
  state.abs = Math.abs(state.velocity);

  lastY = y;
  lastT = now;

  return state;
}
