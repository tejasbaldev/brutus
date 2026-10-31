import { allCoords } from '../engine/coord';
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
  const { size } = view;
  // Flatten once: this runs every AI move, so the inner loops avoid allocating.
  const state = new Uint8Array(size * size); // 0 unknown, 1 open hit, 2 blocked
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = view.cells[r]?.[c];
      state[r * size + c] = cell === 'unknown' ? 0 : cell === 'hit' ? 1 : 2;
    }
  }

  const scores = new Float64Array(size * size);
  for (const length of view.remainingShipLengths) {
    for (const step of [1, size]) {
      // step 1 walks along a row (horizontal), step `size` down a column (vertical).
      const rows = step === 1 ? size : size - length + 1;
      const cols = step === 1 ? size - length + 1 : size;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const start = r * size + c;
          let hits = 0;
          let blocked = false;
          for (let i = 0; i < length && !blocked; i++) {
            const s = state[start + i * step];
            if (s === 2) blocked = true;
            else if (s === 1) hits++;
          }
          if (blocked) continue;
          const weight = HIT_WEIGHT ** hits;
          for (let i = 0; i < length; i++) {
            const at = start + i * step;
            if (state[at] === 0) scores[at] = (scores[at] ?? 0) + weight;
          }
        }
      }
    }
  }

  return Array.from({ length: size }, (_, r) =>
    Array.from(scores.subarray(r * size, (r + 1) * size)),
  );
}
