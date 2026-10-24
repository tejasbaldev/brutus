/** A source of uniform floats in [0, 1). Injected everywhere so games are reproducible. */
export type Rng = () => number;

/** mulberry32: small, fast, good enough for a board game. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [0, maxExclusive). */
export function randomInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

/** Uniformly pick one element. Throws on an empty list, which is always a caller bug. */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[randomInt(rng, items.length)];
  if (item === undefined) throw new Error('pick() called with an empty list');
  return item;
}
