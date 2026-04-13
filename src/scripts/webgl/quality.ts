// 品質ティア判定 + 動的 FPS 監視
// hardwareConcurrency / deviceMemory + 実測 FPS で high / medium / low を決める。
// Phase 1-C 後半で renderer 側に particle count / shader complexity を渡す。

export type QualityTier = 'high' | 'medium' | 'low';

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

/**
 * ハードウェアスペックから初期ティアを判定。
 * 8コア以上 + 8GB以上 → high、4コア + 4GB → medium、それ以外は low。
 */
export function detectInitialTier(): QualityTier {
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as NavigatorWithMemory).deviceMemory ?? 4;
  if (cores >= 8 && memory >= 8) return 'high';
  if (cores >= 4 && memory >= 4) return 'medium';
  return 'low';
}

/**
 * 1 秒ごとに FPS を計測。閾値以下が連続したら onDowngradeRequest を呼ぶ。
 * 返り値で監視を停止できる。
 */
export function startFPSMonitor(
  onTick: (fps: number) => void,
  onDowngradeRequest: () => void,
  threshold = 30,
  consecutiveSeconds = 3,
): () => void {
  let frames = 0;
  let lastTime = performance.now();
  let lowFpsStreak = 0;
  let raf = 0;
  let stopped = false;

  const tick = (): void => {
    if (stopped) return;
    frames++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      const fps = (frames * 1000) / (now - lastTime);
      onTick(fps);
      if (fps < threshold) {
        lowFpsStreak++;
        if (lowFpsStreak >= consecutiveSeconds) {
          onDowngradeRequest();
          lowFpsStreak = 0;
        }
      } else {
        lowFpsStreak = 0;
      }
      frames = 0;
      lastTime = now;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}
