export const BOARD_SIZE = 10;

export interface Coord {
  readonly row: number;
  readonly col: number;
}

export type Orientation = 'h' | 'v';

export type EngineerShipId =
  'side-project' | 'promotion' | 'oss-lib' | 'pet-project' | 'weekend-hack';

export type IncidentShipId = 'memory-leak' | 'race-condition' | 'flaky-test' | 'dns' | 'off-by-one';

export type ShipId = EngineerShipId | IncidentShipId;

export interface ShipSpec {
  readonly id: ShipId;
  readonly length: number;
}

/** Ships are stored as placements; their cells are always derived (see shipCells). */
export interface ShipPlacement {
  readonly id: ShipId;
  readonly origin: Coord;
  readonly orientation: Orientation;
  readonly length: number;
}

export type ShotResult =
  | { readonly kind: 'miss' }
  | { readonly kind: 'hit'; readonly shipId: ShipId }
  | { readonly kind: 'sunk'; readonly shipId: ShipId };

export interface Shot {
  readonly coord: Coord;
  readonly result: ShotResult;
}

/** A board and the shots it has received. Shots are the source of truth for hits. */
export interface Board {
  readonly size: number;
  readonly ships: readonly ShipPlacement[];
  readonly shots: readonly Shot[];
}

export type CellView = 'unknown' | 'miss' | 'hit' | 'sunk';

/** What a shooter is allowed to know about a board. Never exposes unhit ship positions. */
export interface BoardView {
  readonly size: number;
  readonly cells: readonly (readonly CellView[])[];
  readonly remainingShipLengths: readonly number[];
}

export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
