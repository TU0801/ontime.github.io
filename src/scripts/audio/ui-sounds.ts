// UI サウンドスケープ。環境音 (ambient) が再生中の時だけ短い chime を鳴らす。
// rate-limit で連打を抑制し、各イベントに対して音色を用意する。
// Tone の既存 context を共有するので、新たな AudioContext は作らない。

import * as Tone from 'tone';

import { isAmbientPlaying } from './ambient';

type SoundKind = 'open' | 'close' | 'click' | 'hover' | 'select';

let synth: Tone.PolySynth<Tone.Synth> | null = null;
let reverb: Tone.Reverb | null = null;
let initialized = false;

const lastPlay: Record<SoundKind, number> = {
  open: 0,
  close: 0,
  click: 0,
  hover: 0,
  select: 0,
};

const MIN_INTERVAL_MS: Record<SoundKind, number> = {
  open: 200,
  close: 200,
  click: 80,
  hover: 250,
  select: 100,
};

const PRESETS: Record<SoundKind, { notes: string[]; duration: string; vol: number }> = {
  open: { notes: ['C5', 'G5'], duration: '8n', vol: -22 },
  close: { notes: ['G4', 'C4'], duration: '16n', vol: -26 },
  click: { notes: ['E6'], duration: '32n', vol: -32 },
  hover: { notes: ['B5'], duration: '32n', vol: -38 },
  select: { notes: ['A5', 'E6'], duration: '16n', vol: -26 },
};

function ensure(): void {
  if (initialized) return;
  reverb = new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination();
  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.002, decay: 0.15, sustain: 0.05, release: 0.4 },
  }).connect(reverb);
  initialized = true;
}

export function playUiSound(kind: SoundKind): void {
  if (!isAmbientPlaying()) return;
  const now = Date.now();
  if (now - lastPlay[kind] < MIN_INTERVAL_MS[kind]) return;
  lastPlay[kind] = now;

  ensure();
  const s = synth;
  if (!s) return;
  const preset = PRESETS[kind];
  s.volume.value = preset.vol;
  try {
    s.triggerAttackRelease(preset.notes, preset.duration);
  } catch {
    // Tone の state 遷移中などは無視
  }
}

export function disposeUiSounds(): void {
  synth?.dispose();
  reverb?.dispose();
  synth = null;
  reverb = null;
  initialized = false;
}
