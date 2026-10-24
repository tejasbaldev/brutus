import type { AiTier } from '../ai';

/**
 * Optional URL overrides for review and end-to-end tests, e.g. `?tier=3&seed=42&delay=0`.
 * Players never need these.
 */
export interface DebugParams {
  readonly tier: AiTier | undefined;
  readonly seed: number | undefined;
  readonly aiDelayMs: number | undefined;
}

export function readDebugParams(search: string = window.location.search): DebugParams {
  const params = new URLSearchParams(search);
  const int = (key: string) => {
    const raw = params.get(key);
    if (raw === null || !/^\d+$/.test(raw)) return undefined;
    return Number(raw);
  };
  const tier = int('tier');
  return {
    tier: tier === 1 || tier === 2 || tier === 3 ? tier : undefined,
    seed: int('seed'),
    aiDelayMs: int('delay'),
  };
}
