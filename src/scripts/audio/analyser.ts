// オーディオ解析ブリッジ: Tone.js の出力を FFT にタップし、bass / mid / high / energy を
// 毎フレーム WebGL uniform に橋渡しする。
// 設計メモ:
//  - 再生していない間は smoothed 値をゆっくり 0 に戻すので、uniform 側は常に安全に読める
//  - attack 速く decay 遅い非対称イージングでビート感を残す
//  - 帯域分割は C2/G2/D3 ドローン + E5〜E6 アルペジオに合わせ、低域を重視

import * as Tone from 'tone';

export type AudioFeatures = {
  energy: number;
  bass: number;
  mid: number;
  high: number;
};

const FFT_SIZE = 128;
const BASS_HZ = 250;
const MID_HZ = 2000;

const ATTACK = 0.45; // 立ち上がり（速く反応）
const DECAY = 0.08; // 減衰（余韻を残す）
const IDLE_DECAY = 0.92; // 停止後のゆっくりとしたフェード

let fft: Tone.FFT | null = null;
let sampleRate = 48000;

const smoothed: AudioFeatures = { energy: 0, bass: 0, mid: 0, high: 0 };

const smooth = (current: number, target: number): number => {
  const rate = target > current ? ATTACK : DECAY;
  return current + (target - current) * rate;
};

export function startAudioAnalyser(source: Tone.ToneAudioNode): void {
  if (fft) return;
  fft = new Tone.FFT({ size: FFT_SIZE, smoothing: 0.65 });
  source.connect(fft);
  sampleRate = Tone.getContext().sampleRate;
}

export function stopAudioAnalyser(): void {
  if (!fft) return;
  try {
    fft.dispose();
  } catch {
    // ignore dispose race
  }
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

  const values = fft.getValue() as Float32Array;
  const N = values.length;
  // Tone.FFT は dB スケール（概ね -100..0）で返す。0..1 に正規化する。
  const toLinear = (db: number): number => {
    if (!Number.isFinite(db)) return 0;
    return Math.max(0, Math.min(1, (db + 100) / 100));
  };

  const binHz = sampleRate / (FFT_SIZE * 2);
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
