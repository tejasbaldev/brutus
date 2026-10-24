import type { Rng } from '../engine/rng';
import { createRandomAi } from './tier1-random';
import { createHuntTargetAi } from './tier2-hunt-target';
import { createDensityAi } from './tier3-density';
import type { Ai, AiTier } from './types';

export type { Ai, AiTier, BoardView, CellView, ShotRecord } from './types';
export { densityMap } from './tier3-density';

export function createAi(tier: AiTier, rng: Rng): Ai {
  switch (tier) {
    case 1:
      return createRandomAi(rng);
    case 2:
      return createHuntTargetAi(rng);
    case 3:
      return createDensityAi(rng);
  }
}
