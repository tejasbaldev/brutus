import { coord, coordKey, neighbours } from '../engine/coord';
import { pick, type Rng } from '../engine/rng';
import type { Coord } from '../engine/types';
import type { Ai, BoardView } from './types';
import { assertHasTargets, cellAt, isUnknown, openHits, unknownCells } from './view';

/**
 * Tier 2: hunt and target.
 * - Target: with an open hit, probe the unknown cells next to it. Once two hits line up,
 *   extend the line from either end before trying anything else.
 * - Hunt: otherwise, fire on a checkerboard. Every ship is at least 2 long, so one colour
 *   of the board is enough to find them all.
 */
export function createHuntTargetAi(rng: Rng): Ai {
  return {
    tier: 2,
    chooseShot(view) {
      assertHasTargets(view);
      const targets = targetCandidates(view);
      if (targets.length > 0) return pick(rng, targets);
      const unknown = unknownCells(view);
      const parity = unknown.filter((c) => (c.row + c.col) % 2 === 0);
      return pick(rng, parity.length > 0 ? parity : unknown);
    },
  };
}

/** Exported for tests: the cells Tier 2 would choose between in target mode. */
export function targetCandidates(view: BoardView): Coord[] {
  const hits = openHits(view);
  if (hits.length === 0) return [];

  const lineEnds = dedupe(hits.flatMap((h) => lineEndsThrough(view, h)));
  if (lineEnds.length > 0) return lineEnds;

  return dedupe(hits.flatMap((h) => neighbours(h, view.size).filter((n) => isUnknown(view, n))));
}

const AXES = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
] as const;

/** For each axis where this hit has a hit neighbour, the unknown cells just past both ends. */
function lineEndsThrough(view: BoardView, hit: Coord): Coord[] {
  const ends: Coord[] = [];
  for (const { dr, dc } of AXES) {
    const isHit = (c: Coord) => cellAt(view, c) === 'hit';
    const before = coord(hit.row - dr, hit.col - dc);
    const after = coord(hit.row + dr, hit.col + dc);
    if (!isHit(before) && !isHit(after)) continue;

    for (const step of [-1, 1]) {
      let c = hit;
      while (isHit(c)) c = coord(c.row + dr * step, c.col + dc * step);
      if (isUnknown(view, c)) ends.push(c);
    }
  }
  return ends;
}

function dedupe(cells: Coord[]): Coord[] {
  const seen = new Map(cells.map((c) => [coordKey(c), c]));
  return [...seen.values()];
}
