import { describe, expect, it } from 'vitest';
import { createRng, pick, randomInt } from './rng';

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, a);
    const seqB = Array.from({ length: 10 }, b);
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    expect(createRng(1)()).not.toEqual(createRng(2)());
  });

  it('stays within [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('randomInt', () => {
  it('covers the full range and nothing outside it', () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i++) seen.add(randomInt(rng, 10));
    expect([...seen].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('pick', () => {
  it('returns an element of the list', () => {
    const rng = createRng(9);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) expect(items).toContain(pick(rng, items));
  });

  it('throws on an empty list', () => {
    expect(() => pick(createRng(1), [])).toThrow();
  });
});
