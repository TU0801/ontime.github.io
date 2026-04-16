// Tone.js による環境音（オプトイン）
// drone（C2/G2/D3）+ 疎な arp で「未来感ある背景音」

import * as Tone from 'tone';

import { startAudioAnalyser, stopAudioAnalyser } from './analyser';

let initialized = false;
let synth: Tone.PolySynth | null = null;
let reverb: Tone.Reverb | null = null;
let filter: Tone.Filter | null = null;
let arpInterval: number | null = null;

const DRONE_NOTES = ['C2', 'G2', 'D3'] as const;
const ARP_SEQUENCE = ['E5', 'G5', 'A5', 'C6', 'B5', 'D6', 'A5', 'E6'] as const;

export async function startAmbient(): Promise<void> {
  if (initialized) return;
  await Tone.start();

  reverb = new Tone.Reverb({ decay: 6, wet: 0.6 }).toDestination();
  filter = new Tone.Filter(800, 'lowpass').connect(reverb);
  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 2, decay: 0.5, sustain: 0.8, release: 4 },
  }).connect(filter);
  synth.volume.value = -28;

  // FFT タップ（出力は destination に流れ続け、解析のみ並列で取り出す）
  startAudioAnalyser(reverb);

  for (const note of DRONE_NOTES) {
    synth.triggerAttack(note);
  }

  let i = 0;
  arpInterval = window.setInterval(() => {
    if (!synth) return;
    const note = ARP_SEQUENCE[i % ARP_SEQUENCE.length];
    if (note) synth.triggerAttackRelease(note, '2n');
    i++;
  }, 3500);

  initialized = true;
}

export function stopAmbient(): void {
  if (!initialized) return;
  if (arpInterval) {
    clearInterval(arpInterval);
    arpInterval = null;
  }
  synth?.releaseAll();
  setTimeout(() => {
    synth?.dispose();
    filter?.dispose();
    reverb?.dispose();
    stopAudioAnalyser();
    synth = null;
    filter = null;
    reverb = null;
    initialized = false;
  }, 1000);
}

export function isAmbientPlaying(): boolean {
  return initialized;
}
