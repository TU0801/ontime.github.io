// オーディオ解析ブリッジ: 外部（ambient.ts）から Tone.FFT 相当のノードを注入され、
// bass / mid / high / energy を毎フレーム WebGL uniform に橋渡しする。
// 設計メモ:
//  - Tone.js への依存を持たず、duck-typed `FFTLike` を受け取るだけ。
//    これにより WebGL 側 / perf-overlay / variable-font が本ファイルを
//    static import しても tone は bundle に入らない（環境音 ON 時のみ遅延ロード）
//  - 再生していない間は smoothed 値をゆっくり 0 に戻すので、uniform 側は常に安全に読める
//  - attack 速く decay 遅い非対称イージングでビート感を残す
//  - 帯域分割は C2/G2/D3 ドローン + E5〜E6 アルペジオに合わせ、低域を重視

export type AudioFeatures = {
  energy: number;
  bass: number;
  mid: number;
  high: number;
};

type FFTLike = { getValue(): Float32Array };

const BASS_HZ = 250;
const MID_HZ = 2000;

const ATTACK = 0.45; // 立ち上がり（速く反応）
const DECAY = 0.08; // 減衰（余韻を残す）
const IDLE_DECAY = 0.92; // 停止後のゆっくりとしたフェード

let fft: FFTLike | null = null;
let fftSize = 128;
let sampleRate = 48000;

const smoothed: AudioFeatures = { energy: 0, bass: 0, mid: 0, high: 0 };

const smooth = (current: number, target: number): number => {
  const rate = target > current ? ATTACK : DECAY;
  return current + (target - current) * rate;
};

export function setAnalyserNode(node: FFTLike, size: number, rate: number): void {
  fft = node;
  fftSize = size;
  sampleRate = rate;
}

export function clearAnalyserNode(): void {
  fft = null;
}

export function sampleAudioFeatures(): AudioFeatures {
  if (!fft) {
    smoothed.energy *= IDLE_DECAY;
    smoothed.bass *= IDLE_DECAY;
    smoothed.mid *= IDLE_DECAY;
    smoothed.high *= IDLE_DECAY;
    return { ...smoothed };
  }

  const values = fft.getValue();
  const N = values.length;
  // Tone.FFT は dB スケール（概ね -100..0）で返す。0..1 に正規化する。
  const toLinear = (db: number): number => {
    if (!Number.isFinite(db)) return 0;
    return Math.max(0, Math.min(1, (db + 100) / 100));
  };

  const binHz = sampleRate / (fftSize * 2);
  let bassSum = 0;
  let bassCount = 0;
  let midSum = 0;
  let midCount = 0;
  let highSum = 0;
  let highCount = 0;
  let total = 0;

  for (let i = 0; i < N; i++) {
    const hz = i * binHz;
    const v = toLinear(values[i] ?? -100);
    total += v;
    if (hz < BASS_HZ) {
      bassSum += v;
      bassCount++;
    } else if (hz < MID_HZ) {
      midSum += v;
      midCount++;
    } else {
      highSum += v;
      highCount++;
    }
  }

  // 静寂時に下駄を履かないよう、下限を押し下げてダイナミックレンジを広げる
  const normalize = (v: number): number => {
    const adjusted = (v - 0.25) / 0.55;
    return Math.max(0, Math.min(1, adjusted));
  };

  const energy = normalize(total / Math.max(1, N));
  const bass = normalize(bassCount ? bassSum / bassCount : 0);
  const mid = normalize(midCount ? midSum / midCount : 0);
  const high = normalize(highCount ? highSum / highCount : 0);

  smoothed.energy = smooth(smoothed.energy, energy);
  smoothed.bass = smooth(smoothed.bass, bass);
  smoothed.mid = smooth(smoothed.mid, mid);
  smoothed.high = smooth(smoothed.high, high);

  return { ...smoothed };
}
