import { pick, type Rng } from '../engine/rng';
import type { Ai } from './types';
import { assertHasTargets, unknownCells } from './view';

/** Tier 1: fires at any cell it hasn't tried, uniformly at random. */
export function createRandomAi(rng: Rng): Ai {
  return {
    tier: 1,
    chooseShot(view) {
      assertHasTargets(view);
      return pick(rng, unknownCells(view));
    },
  };
}
