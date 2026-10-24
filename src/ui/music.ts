// A generative ambient score, synthesized with the Web Audio API: slow pad chords over a quiet
// pulse. Each mood sets the key colour, tempo and tension. Nothing here plays unless the player
// turned sound on (see useMusic).

import { createRng, pick, type Rng } from '../engine/rng';
import { audioContext } from './sound';

export type Mood = 'title' | 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'coop' | 'ending';

interface MoodSpec {
  /** MIDI note of the key centre. */
  readonly root: number;
  /** Chords as semitone offsets from the root, cycled in order. */
  readonly chords: readonly (readonly number[])[];
  readonly bpm: number;
  /** Pulse loudness, 0 for none. */
  readonly pulse: number;
  /** Low-pass cutoff for the pads: higher is brighter and more present. */
  readonly cutoff: number;
  /** Chance per bar of a high, bell-like note. */
  readonly sparkle: number;
}

const A2 = 45;

export const MOODS: Record<Mood, MoodSpec> = {
  title: {
    root: A2,
    chords: [
      [0, 7, 15, 19],
      [-4, 3, 12, 19],
      [-7, 5, 12, 20],
      [-2, 5, 10, 17],
    ],
    bpm: 54,
    pulse: 0,
    cutoff: 800,
    sparkle: 0.25,
  },
  ch1: {
    root: A2,
    chords: [
      [0, 7, 15, 19],
      [-4, 3, 12, 19],
      [-7, 5, 12, 20],
      [-2, 5, 10, 17],
    ],
    bpm: 58,
    pulse: 0.05,
    cutoff: 900,
    sparkle: 0.3,
  },
  ch2: {
    root: A2,
    chords: [
      [0, 7, 15, 22],
      [-2, 5, 10, 17],
      [-4, 3, 12, 19],
      [-5, 2, 7, 15],
    ],
    bpm: 62,
    pulse: 0.07,
    cutoff: 1050,
    sparkle: 0.3,
  },
  ch3: {
    root: A2,
    chords: [
      [0, 6, 10, 15],
      [-2, 5, 11, 15],
      [-4, 3, 8, 14],
      [-1, 5, 10, 14],
    ],
    bpm: 68,
    pulse: 0.1,
    cutoff: 1300,
    sparkle: 0.2,
  },
  ch4: {
    root: A2,
    chords: [
      [0, 6, 10, 13],
      [-1, 5, 11, 15],
      [0, 7, 10, 13],
      [-3, 3, 9, 15],
    ],
    bpm: 76,
    pulse: 0.13,
    cutoff: 1600,
    sparkle: 0.15,
  },
  coop: {
    root: A2,
    chords: [
      [0, 7, 14, 19],
      [-2, 5, 12, 19],
      [-7, 5, 12, 21],
      [-4, 3, 12, 19],
    ],
    bpm: 62,
    pulse: 0.06,
    cutoff: 1100,
    sparkle: 0.35,
  },
  ending: {
    root: A2,
    chords: [
      [3, 10, 15, 22],
      [0, 7, 15, 19],
      [-4, 3, 12, 19],
      [3, 10, 17, 22],
    ],
    bpm: 50,
    pulse: 0,
    cutoff: 900,
    sparkle: 0.4,
  },
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** One chord's bar count, so the harmony moves slowly. */
const BARS_PER_CHORD = 2;

interface Voice {
  readonly ctx: BaseAudioContext;
  readonly out: AudioNode;
  readonly rng: Rng;
}

function pad({ ctx, out, rng }: Voice, midi: number, at: number, length: number, cutoff: number) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoff, at);
  filter.Q.value = 0.4;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(0.045, at + length * 0.35);
  amp.gain.setValueAtTime(0.045, at + length * 0.6);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
  filter.connect(amp).connect(out);
  // Two slightly detuned oscillators per note give the pad its slow shimmer.
  for (const detune of [-(4 + rng() * 4), 4 + rng() * 4]) {
    const osc = ctx.createOscillator();
    osc.type = detune < 0 ? 'triangle' : 'sine';
    osc.frequency.value = hz(midi);
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(at);
    osc.stop(at + length + 0.1);
  }
}

function pulse({ ctx, out }: Voice, at: number, gain: number) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(62, at);
  osc.frequency.exponentialRampToValueAtTime(38, at + 0.3);
  amp.gain.setValueAtTime(gain, at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
  osc.connect(amp).connect(out);
  osc.start(at);
  osc.stop(at + 0.5);
}

function sparkle({ ctx, out }: Voice, midi: number, at: number) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = hz(midi);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(0.02, at + 0.05);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + 2.4);
  osc.connect(amp).connect(out);
  osc.start(at);
  osc.stop(at + 2.5);
}

/** Schedules bar `n` of `mood`, starting at `at` seconds. Returns the bar's length. */
export function scheduleBar(voice: Voice, mood: Mood, n: number, at: number): number {
  const spec = MOODS[mood];
  const beat = 60 / spec.bpm;
  const bar = beat * 4;
  const chord = spec.chords[Math.floor(n / BARS_PER_CHORD) % spec.chords.length] ?? [];
  if (n % BARS_PER_CHORD === 0) {
    const length = bar * BARS_PER_CHORD + beat;
    for (const offset of chord) pad(voice, spec.root + offset, at, length, spec.cutoff);
  }
  if (spec.pulse > 0) {
    pulse(voice, at, spec.pulse);
    pulse(voice, at + beat * 2, spec.pulse * 0.7);
  }
  if (voice.rng() < spec.sparkle) {
    const offset = pick(voice.rng, chord);
    sparkle(voice, spec.root + 24 + offset, at + beat * Math.floor(voice.rng() * 4));
  }
  return bar;
}

/** Renders `seconds` of a mood into any context (used offline for previews and tests). */
export function renderMood(ctx: BaseAudioContext, mood: Mood, seconds: number, seed = 1): void {
  const voice: Voice = { ctx, out: ctx.destination, rng: createRng(seed) };
  for (let n = 0, at = 0; at < seconds; n++) at += scheduleBar(voice, mood, n, at);
}

const LOOKAHEAD_S = 1.5;
const TICK_MS = 400;

/** The live player: one instance per page, started and stopped with the sound switch. */
export interface Music {
  /** Starts quietly in the current mood; call setMood before the first bar is scheduled. */
  start(seed: number): void;
  setMood(mood: Mood): void;
  stop(): void;
}

export function createMusic(): Music {
  let ctx: AudioContext | undefined;
  let master: GainNode | undefined;
  let timer: number | undefined;
  let mood: Mood = 'title';
  let rng: Rng = createRng(1);
  let bar = 0;
  let nextAt = 0;

  const tick = () => {
    if (!ctx || !master) return;
    const voice: Voice = { ctx, out: master, rng };
    while (nextAt < ctx.currentTime + LOOKAHEAD_S) {
      nextAt += scheduleBar(voice, mood, bar, Math.max(nextAt, ctx.currentTime));
      bar++;
    }
  };

  return {
    start(seed) {
      if (timer !== undefined) return;
      ctx = audioContext();
      if (!ctx) return;
      rng = createRng(seed);
      bar = 0;
      master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 2.5);
      master.connect(ctx.destination);
      nextAt = ctx.currentTime + 0.1;
      timer = window.setInterval(tick, TICK_MS);
    },
    setMood(next) {
      if (next === mood) return;
      mood = next;
      // Restart the chord cycle so the new colour arrives on the next bar.
      bar = 0;
    },
    stop() {
      if (timer === undefined) return;
      window.clearInterval(timer);
      timer = undefined;
      if (ctx && master) {
        const fading = master;
        fading.gain.cancelScheduledValues(ctx.currentTime);
        fading.gain.setValueAtTime(fading.gain.value, ctx.currentTime);
        fading.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        window.setTimeout(() => {
          fading.disconnect();
        }, 1500);
      }
      master = undefined;
    },
  };
}
