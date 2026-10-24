import { allCoords } from '../engine/coord';
import type { Coord } from '../engine/types';
import type { BoardView, CellView } from './types';

export const cellAt = (view: BoardView, c: Coord): CellView | undefined =>
  view.cells[c.row]?.[c.col];

export const isUnknown = (view: BoardView, c: Coord): boolean => cellAt(view, c) === 'unknown';

export function unknownCells(view: BoardView): Coord[] {
  return allCoords(view.size).filter((c) => isUnknown(view, c));
}

/** Hits on ships that haven't sunk yet: the AI's open leads. */
export function openHits(view: BoardView): Coord[] {
  return allCoords(view.size).filter((c) => cellAt(view, c) === 'hit');
}

/** Guard for callers: an AI asked to fire at a fully-shot board is a bug upstream. */
export function assertHasTargets(view: BoardView): void {
  if (unknownCells(view).length === 0) throw new Error('chooseShot called with no unknown cells');
}
