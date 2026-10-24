import { allCoords, coord } from '../engine/coord';
import { pick, type Rng } from '../engine/rng';
import type { Coord } from '../engine/types';
import type { Ai, BoardView } from './types';
import { assertHasTargets, cellAt } from './view';

/** How much more a placement counts for each open hit it explains. */
const HIT_WEIGHT = 50;

/**
 * Tier 3: probability density.
 * For every ship still afloat, count every way it could lie on the board given what's known
 * (no misses, no sunk cells). Placements that pass through open hits count far more.
 * Fire at the cell the most placements agree on.
 */
export function createDensityAi(rng: Rng): Ai {
  return {
    tier: 3,
    chooseShot(view) {
      assertHasTargets(view);
      const map = densityMap(view);
      let best = -1;
      let ties: Coord[] = [];
      for (const c of allCoords(view.size)) {
        if (cellAt(view, c) !== 'unknown') continue;
        const score = map[c.row]?.[c.col] ?? 0;
        if (score > best) {
          best = score;
          ties = [c];
        } else if (score === best) {
          ties.push(c);
        }
      }
      return pick(rng, ties);
    },
  };
}

/**
 * Relative likelihood that each cell holds a ship, from the shooter's point of view.
 * Only unknown cells score; everything else is 0. Also drives the co-op hint overlay.
 */
export function densityMap(view: BoardView): number[][] {
  const map = Array.from({ length: view.size }, () => Array.from({ length: view.size }, () => 0));

  for (const length of view.remainingShipLengths) {
    for (const origin of allCoords(view.size)) {
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ] as const) {
        const cells = Array.from({ length }, (_, i) =>
          coord(origin.row + dr * i, origin.col + dc * i),
        );
        const states = cells.map((c) => cellAt(view, c));
        if (states.some((s) => s === undefined || s === 'miss' || s === 'sunk')) continue;

        const hits = states.filter((s) => s === 'hit').length;
        const weight = HIT_WEIGHT ** hits;
        cells.forEach((c, i) => {
          const row = map[c.row];
          if (row && states[i] === 'unknown') row[c.col] = (row[c.col] ?? 0) + weight;
        });
      }
    }
  }
  return map;
}
