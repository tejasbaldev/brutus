import { coord, coordKey, inBounds } from './coord';
import { randomInt, type Rng } from './rng';
import {
  BOARD_SIZE,
  err,
  ok,
  type Coord,
  type Orientation,
  type Result,
  type ShipId,
  type ShipPlacement,
  type ShipSpec,
} from './types';

export type PlacementError = 'unknown-ship' | 'wrong-length' | 'out-of-bounds' | 'overlap';

export function shipCells(p: ShipPlacement): Coord[] {
  return Array.from({ length: p.length }, (_, i) =>
    p.orientation === 'h'
      ? coord(p.origin.row, p.origin.col + i)
      : coord(p.origin.row + i, p.origin.col),
  );
}

/**
 * Checks one placement against the fleet spec and the ships already placed.
 * A ship with the same id is ignored, so re-placing a ship validates as a move.
 * Ships may touch (standard rules); they may not overlap.
 */
export function validatePlacement(
  placed: readonly ShipPlacement[],
  placement: ShipPlacement,
  fleet: readonly ShipSpec[],
  size: number = BOARD_SIZE,
): Result<true, PlacementError> {
  const spec = fleet.find((s) => s.id === placement.id);
  if (!spec) return err('unknown-ship');
  if (spec.length !== placement.length) return err('wrong-length');

  const cells = shipCells(placement);
  if (!cells.every((c) => inBounds(c, size))) return err('out-of-bounds');

  const occupied = new Set(
    placed.filter((p) => p.id !== placement.id).flatMap((p) => shipCells(p).map(coordKey)),
  );
  if (cells.some((c) => occupied.has(coordKey(c)))) return err('overlap');

  return ok(true);
}

/** Adds a ship, replacing any existing placement with the same id. */
export function placeShip(
  placed: readonly ShipPlacement[],
  placement: ShipPlacement,
  fleet: readonly ShipSpec[],
  size: number = BOARD_SIZE,
): Result<readonly ShipPlacement[], PlacementError> {
  const valid = validatePlacement(placed, placement, fleet, size);
  if (!valid.ok) return valid;
  return ok([...placed.filter((p) => p.id !== placement.id), placement]);
}

export function removeShip(placed: readonly ShipPlacement[], id: ShipId): readonly ShipPlacement[] {
  return placed.filter((p) => p.id !== id);
}

/** True when every ship in the fleet is placed exactly once and validly. */
export function isFleetComplete(
  placed: readonly ShipPlacement[],
  fleet: readonly ShipSpec[],
  size: number = BOARD_SIZE,
): boolean {
  if (placed.length !== fleet.length) return false;
  if (!fleet.every((spec) => placed.some((p) => p.id === spec.id))) return false;
  return placed.every((p) => validatePlacement(placed, p, fleet, size).ok);
}

const MAX_ATTEMPTS_PER_SHIP = 200;
const MAX_RESTARTS = 1000;

/** Places the whole fleet at random. Deterministic for a given rng state. */
export function randomPlacement(
  fleet: readonly ShipSpec[],
  rng: Rng,
  size: number = BOARD_SIZE,
): readonly ShipPlacement[] {
  // Largest first: it is the hardest to fit. Restart from scratch on a dead end.
  const ordered = [...fleet].sort((a, b) => b.length - a.length);
  for (let restart = 0; restart < MAX_RESTARTS; restart++) {
    const placed = tryPlaceAll(ordered, fleet, rng, size);
    if (placed) return placed;
  }
  throw new RangeError(`Fleet cannot fit together on a ${size}×${size} board`);
}

function tryPlaceAll(
  ordered: readonly ShipSpec[],
  fleet: readonly ShipSpec[],
  rng: Rng,
  size: number,
): ShipPlacement[] | undefined {
  const placed: ShipPlacement[] = [];
  for (const spec of ordered) {
    let done = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_SHIP && !done; attempt++) {
      const orientation: Orientation = rng() < 0.5 ? 'h' : 'v';
      const span = size - spec.length + 1;
      if (span <= 0) throw new RangeError(`Ship ${spec.id} cannot fit on a ${size}×${size} board`);
      const origin =
        orientation === 'h'
          ? coord(randomInt(rng, size), randomInt(rng, span))
          : coord(randomInt(rng, span), randomInt(rng, size));
      const candidate: ShipPlacement = { id: spec.id, origin, orientation, length: spec.length };
      if (validatePlacement(placed, candidate, fleet, size).ok) {
        placed.push(candidate);
        done = true;
      }
    }
    if (!done) return undefined;
  }
  return placed;
}
