// Tone.js による環境音（オプトイン）
// Cmaj7 → Fmaj9 → G7sus → Am7 の 4 コード循環を 16 秒周期で回し、
// pad / bell / shimmer の 3 レイヤーで空気感を作る。
// analyser.ts は reverb 出力をタップするので、シェーダーのオーディオ反応は
// 従来どおり自動で引き継がれる。

import * as Tone from 'tone';

import { startAudioAnalyser, stopAudioAnalyser } from './analyser';

type Disposable = { dispose(): void };

let initialized = false;
const disposables: Disposable[] = [];
let loopId: number | null = null;

type Chord = readonly [string, string, string, string];

// Major 7th を中心に穏やかな循環
const PROGRESSION: readonly Chord[] = [
  ['C3', 'E3', 'G3', 'B3'], // Cmaj7
  ['F3', 'A3', 'C4', 'E4'], // Fmaj9（9th 感は C4）
  ['G3', 'B3', 'D4', 'F4'], // G7sus/11 風
  ['A3', 'C4', 'E4', 'G4'], // Am7
] as const;

const BELL_MELODY: readonly string[] = [
  'E5',
  'G5',
  'A5',
  'B5',
  'G5',
  'E5',
  'F5',
  'A5',
  'C6',
  'A5',
  'F5',
  'E5',
];

const CHORD_DURATION = 4; // 秒
const MELODY_INTERVAL = 2200; // ms

export async function startAmbient(): Promise<void> {
  if (initialized) return;
  await Tone.start();

  // === バス: reverb + gentle chorus → destination ===
  const reverb = new Tone.Reverb({ decay: 7, wet: 0.55 }).toDestination();
  const chorus = new Tone.Chorus({ frequency: 0.6, delayTime: 3.5, depth: 0.5, wet: 0.3 })
    .connect(reverb)
    .start();
  disposables.push(reverb, chorus);

  // === Pad: 和音を支える厚めのレイヤー ===
  const padFilter = new Tone.Filter(1200, 'lowpass').connect(chorus);
  // LFO で filter が呼吸するように
  const filterLfo = new Tone.LFO('0.08hz', 800, 2000).connect(padFilter.frequency);
  filterLfo.start();
  const pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 3.5, decay: 1.5, sustain: 0.85, release: 5 },
  }).connect(padFilter);
  pad.volume.value = -18;
  disposables.push(padFilter, filterLfo, pad);

  // === Bell: 高域メロディ ===
  const bellFilter = new Tone.Filter(3200, 'lowpass').connect(chorus);
  const bell = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 2,
    modulationIndex: 2,
    detune: 0,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.02, decay: 0.8, sustain: 0.1, release: 2.5 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.5, decay: 0.3, sustain: 0.2, release: 0.8 },
  }).connect(bellFilter);
  bell.volume.value = -22;
  disposables.push(bellFilter, bell);

  // === Shimmer: 高い sine の微妙な sparkle ===
  const shimmer = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 1.2, decay: 0.6, sustain: 0.3, release: 3 },
  }).connect(chorus);
  shimmer.volume.value = -26;
  disposables.push(shimmer);

  // === 和声進行の駆動 ===
  let chordIndex = 0;
  let heldNotes: string[] = [];

  const playChord = (): void => {
    // 前のコードをリリース
    if (heldNotes.length > 0) {
      pad.triggerRelease(heldNotes);
    }
    const chord = PROGRESSION[chordIndex % PROGRESSION.length];
    if (!chord) return;
    heldNotes = [...chord];
    pad.triggerAttack(heldNotes);
    // shimmer は chord の最高音をわずかに重ねる（オクターブ上）
    const top = chord[3];
    if (top) {
      const oct = top.replace(/\d$/, (d) => String(Number(d) + 1));
      shimmer.triggerAttackRelease(oct, '2n');
    }
    chordIndex++;
  };

  playChord();
  loopId = window.setInterval(playChord, CHORD_DURATION * 1000);

  // === ベルメロディ: 別周期で流す ===
  let melodyIndex = 0;
  const melodyTimer = window.setInterval(() => {
    const note = BELL_MELODY[melodyIndex % BELL_MELODY.length];
    if (note) bell.triggerAttackRelease(note, '4n');
    melodyIndex++;
  }, MELODY_INTERVAL);

  // dispose 時にインターバルも片付ける
  disposables.push({
    dispose: () => {
      if (loopId !== null) clearInterval(loopId);
      clearInterval(melodyTimer);
    },
  });

  // === FFT タップ（reverb を watch）===
  startAudioAnalyser(reverb);

  initialized = true;
}

export function stopAmbient(): void {
  if (!initialized) return;
  // 先にインターバルを止めて新規トリガーを止める
  if (loopId !== null) {
    clearInterval(loopId);
    loopId = null;
  }
  // リリース（残響を聞かせる）→ 全 dispose
  setTimeout(() => {
    for (const d of disposables) {
      try {
        d.dispose();
      } catch {
        // ignore
      }
    }
    disposables.length = 0;
    stopAudioAnalyser();
    initialized = false;
  }, 1600);
}

export function isAmbientPlaying(): boolean {
  return initialized;
}
