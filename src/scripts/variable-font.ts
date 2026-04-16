// Variable font motion: Montserrat / Noto Sans JP の wght 軸を
// 音の帯域 + スクロール進行で 0.5〜1.5x 程度に呼吸させる。
// ルート CSS 変数 --font-pulse-wght（0..1）に流し込み、対象セレクタ側で
// font-variation-settings: 'wght' calc(base + var(--font-pulse-wght) * delta) を使う。

import { sampleAudioFeatures } from './audio/analyser';
import { sampleScrollFeatures } from './scroll/scroll-state';

export function initVariableFontMotion(): (() => void) | undefined {
  if (typeof document === 'undefined') return undefined;

  const root = document.documentElement;
  let raf = 0;
  let smoothed = 0;

  const tick = (): void => {
    raf = requestAnimationFrame(tick);
    const audio = sampleAudioFeatures();
    const scroll = sampleScrollFeatures();

    // energy + scroll velocity を混ぜた脈動値
    const target = Math.min(
      1,
      audio.energy * 0.9 + audio.bass * 0.3 + Math.abs(scroll.velocity) * 0.6,
    );
    // 急激な変化は滑らかに
    smoothed += (target - smoothed) * 0.18;

    root.style.setProperty('--font-pulse-wght', smoothed.toFixed(3));
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    root.style.removeProperty('--font-pulse-wght');
  };
}
