// Tiny synthesized cues (Web Audio, no files). Only ever called when the player turned sound on.

import type { ShotResult } from '../engine/types';

let context: AudioContext | undefined;

/** The page's one AudioContext, created on first use (after a user gesture). */
export function audioContext(): AudioContext | undefined {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return undefined;
  }
}

interface Tone {
  readonly from: number;
  readonly to: number;
  readonly at: number;
  readonly length: number;
  readonly type: OscillatorType;
  readonly gain: number;
}

function tone(ctx: AudioContext, { from, to, at, length, type, gain }: Tone) {
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + length);
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + length);
}

const CUES: Record<ShotResult['kind'], readonly Tone[]> = {
  miss: [{ from: 240, to: 190, at: 0, length: 0.12, type: 'sine', gain: 0.04 }],
  hit: [{ from: 150, to: 70, at: 0, length: 0.2, type: 'triangle', gain: 0.14 }],
  sunk: [
    { from: 150, to: 70, at: 0, length: 0.2, type: 'triangle', gain: 0.14 },
    { from: 330, to: 320, at: 0.16, length: 0.22, type: 'sine', gain: 0.05 },
    { from: 220, to: 210, at: 0.34, length: 0.36, type: 'sine', gain: 0.05 },
  ],
};

export function playShot(result: ShotResult): void {
  const ctx = audioContext();
  if (!ctx) return;
  for (const t of CUES[result.kind]) tone(ctx, t);
}
