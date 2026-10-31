import type { AiTier } from '../ai';
import type { Chapter } from '../engine/campaign';

/**
 * Optional URL overrides for review and end-to-end tests, e.g. `?chapter=4&tier=3&seed=42&delay=0`.
 * Players never need these.
 */
export interface DebugParams {
  readonly tier: AiTier | undefined;
  readonly seed: number | undefined;
  readonly aiDelayMs: number | undefined;
  /** Start a new campaign at this chapter. */
  readonly chapter: Chapter | undefined;
}

/** Longer delays would leave the AI 'thinking' indefinitely. */
export const MAX_AI_DELAY_MS = 10_000;

export function readDebugParams(search: string = window.location.search): DebugParams {
  const params = new URLSearchParams(search);
  const int = (key: string) => {
    const raw = params.get(key);
    if (raw === null || !/^\d+$/.test(raw)) return undefined;
    return Number(raw);
  };
  const tier = int('tier');
  const chapter = int('chapter');
  const delay = int('delay');
  return {
    tier: tier === 1 || tier === 2 || tier === 3 ? tier : undefined,
    seed: int('seed'),
    aiDelayMs: delay !== undefined && delay <= MAX_AI_DELAY_MS ? delay : undefined,
    chapter: chapter === 1 || chapter === 2 || chapter === 3 || chapter === 4 ? chapter : undefined,
  };
}
