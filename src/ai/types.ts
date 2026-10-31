import type { BoardView, Coord, Shot } from '../engine/types';

export type { BoardView, CellView } from '../engine/types';

export type AiTier = 1 | 2 | 3;

/** One shot the AI (or, in co-op, either side) has fired at the board it sees. */
export type ShotRecord = Shot;

/**
 * Every tier implements this. Implementations are stateless between calls: whatever they
 * need is rebuilt from `boardView` and `history`. They must only return 'unknown' cells.
 */
export interface Ai {
  readonly tier: AiTier;
  chooseShot(boardView: BoardView, history: readonly ShotRecord[]): Coord;
}
