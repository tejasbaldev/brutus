import { coordKey, inBounds, sameCoord } from './coord';
import { shipCells } from './placement';
import {
  BOARD_SIZE,
  err,
  ok,
  type Board,
  type BoardView,
  type CellView,
  type Coord,
  type Result,
  type ShipId,
  type ShipPlacement,
  type Shot,
} from './types';

export type FireError = 'out-of-bounds' | 'already-shot';

export function createBoard(ships: readonly ShipPlacement[], size: number = BOARD_SIZE): Board {
  return { size, ships, shots: [] };
}

export function shipAt(board: Board, c: Coord): ShipPlacement | undefined {
  return board.ships.find((ship) => shipCells(ship).some((cell) => sameCoord(cell, c)));
}

export function hasBeenShot(board: Board, c: Coord): boolean {
  return board.shots.some((shot) => sameCoord(shot.coord, c));
}

export function isSunk(board: Board, id: ShipId): boolean {
  const ship = board.ships.find((s) => s.id === id);
  if (!ship) return false;
  return shipCells(ship).every((cell) => hasBeenShot(board, cell));
}

export function isFleetSunk(board: Board): boolean {
  return board.ships.every((ship) => isSunk(board, ship.id));
}

/** Fires one shot. Returns the new board (the input is never mutated) and the shot taken. */
export function fire(board: Board, c: Coord): Result<{ board: Board; shot: Shot }, FireError> {
  if (!inBounds(c, board.size)) return err('out-of-bounds');
  if (hasBeenShot(board, c)) return err('already-shot');

  const target = shipAt(board, c);
  let shot: Shot;
  if (!target) {
    shot = { coord: c, result: { kind: 'miss' } };
  } else {
    const sinks = shipCells(target).every((cell) => sameCoord(cell, c) || hasBeenShot(board, cell));
    shot = { coord: c, result: { kind: sinks ? 'sunk' : 'hit', shipId: target.id } };
  }

  return ok({ board: { ...board, shots: [...board.shots, shot] }, shot });
}

/** The shooter's view: what they have learned, and nothing more. */
export function toView(board: Board): BoardView {
  const cells: CellView[][] = Array.from({ length: board.size }, () =>
    Array.from({ length: board.size }, (): CellView => 'unknown'),
  );
  const sunkCells = new Set(
    board.ships.filter((s) => isSunk(board, s.id)).flatMap((s) => shipCells(s).map(coordKey)),
  );
  for (const { coord: c, result } of board.shots) {
    const row = cells[c.row];
    if (!row) continue;
    row[c.col] = result.kind === 'miss' ? 'miss' : sunkCells.has(coordKey(c)) ? 'sunk' : 'hit';
  }
  return {
    size: board.size,
    cells,
    remainingShipLengths: board.ships.filter((s) => !isSunk(board, s.id)).map((s) => s.length),
  };
}
