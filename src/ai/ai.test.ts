import { describe, expect, it } from 'vitest';
import { coordKey } from '../engine/coord';
import { STANDARD_FLEET } from '../engine/fleet';
import { randomPlacement } from '../engine/placement';
import { createRng } from '../engine/rng';
import { createAi, type AiTier } from './index';
import { shotsToSinkAll, viewFrom } from './test-helpers';

const TIERS: AiTier[] = [1, 2, 3];

describe('createAi', () => {
  it.each(TIERS)('builds tier %i', (tier) => {
    expect(createAi(tier, createRng(1)).tier).toBe(tier);
  });
});

describe.each(TIERS)('tier %i contract', (tier) => {
  it('sinks every fleet without ever repeating a shot or leaving the board', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ships = randomPlacement(STANDARD_FLEET, createRng(seed));
      // shotsToSinkAll throws on any repeat or out-of-bounds shot.
      expect(shotsToSinkAll(createAi(tier, createRng(seed + 1000)), ships)).toBeLessThanOrEqual(
        100,
      );
    }
  });

  it('is deterministic for a seed', () => {
    const ships = randomPlacement(STANDARD_FLEET, createRng(5));
    const a = shotsToSinkAll(createAi(tier, createRng(9)), ships);
    const b = shotsToSinkAll(createAi(tier, createRng(9)), ships);
    expect(a).toBe(b);
  });

  it('takes the only unknown cell left', () => {
    const rows = Array.from({ length: 10 }, () => 'oooooooooo');
    rows[4] = 'oooo.ooooo';
    expect(createAi(tier, createRng(1)).chooseShot(viewFrom(rows, [2]), [])).toEqual({
      row: 4,
      col: 4,
    });
  });

  it('throws when there is nothing left to fire at', () => {
    const rows = Array.from({ length: 10 }, () => 'oooooooooo');
    expect(() => createAi(tier, createRng(1)).chooseShot(viewFrom(rows, []), [])).toThrow();
  });
});

describe('difficulty ordering (benchmark)', () => {
  const GAMES = 200;

  const averageShots = (tier: AiTier) => {
    let total = 0;
    for (let seed = 0; seed < GAMES; seed++) {
      const ships = randomPlacement(STANDARD_FLEET, createRng(seed));
      total += shotsToSinkAll(createAi(tier, createRng(seed * 7 + 3)), ships);
    }
    return total / GAMES;
  };

  it('each tier needs clearly fewer shots than the one below', () => {
    const [t1, t2, t3] = TIERS.map(averageShots) as [number, number, number];
    // Measured over 500 games: ~96, ~51, ~44. Seeded, so deterministic; margins leave room to tune.
    expect(t1).toBeGreaterThan(85);
    expect(t2).toBeLessThan(t1 - 15);
    expect(t3).toBeLessThan(t2 - 3);
    expect(t3).toBeLessThan(60);
  }, 30_000); // 600 full games: deliberately slow, so it gets an explicit budget.
});

describe('tier 1', () => {
  it('spreads its first shot across the board', () => {
    const empty = viewFrom(Array.from({ length: 10 }, () => '..........'));
    const firsts = new Set(
      Array.from({ length: 300 }, (_, seed) =>
        coordKey(createAi(1, createRng(seed)).chooseShot(empty, [])),
      ),
    );
    expect(firsts.size).toBeGreaterThan(80);
  });
});
