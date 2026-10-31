import { describe, expect, it } from 'vitest';
import { createBoard, fire, hasBeenShot, isFleetSunk, isSunk, shipAt, toView } from './board';
import { coord } from './coord';
import type { Board, Coord, ShipPlacement } from './types';

const hack: ShipPlacement = {
  id: 'weekend-hack',
  origin: coord(0, 0),
  orientation: 'h',
  length: 2,
};
const lib: ShipPlacement = { id: 'oss-lib', origin: coord(5, 5), orientation: 'v', length: 3 };

const fireAll = (board: Board, coords: Coord[]): Board =>
  coords.reduce((b, c) => {
    const r = fire(b, c);
    if (!r.ok) throw new Error(`fire failed at ${c.row},${c.col}: ${r.error}`);
    return r.value.board;
  }, board);

describe('shipAt', () => {
  it('finds the ship covering a cell, or nothing', () => {
    const board = createBoard([hack, lib]);
    expect(shipAt(board, coord(0, 1))?.id).toBe('weekend-hack');
    expect(shipAt(board, coord(7, 5))?.id).toBe('oss-lib');
    expect(shipAt(board, coord(9, 9))).toBeUndefined();
  });
});

describe('fire', () => {
  it('records a miss on empty water', () => {
    const r = fire(createBoard([hack]), coord(9, 9));
    expect(r.ok && r.value.shot).toEqual({ coord: coord(9, 9), result: { kind: 'miss' } });
  });

  it('records a hit on a ship that still floats', () => {
    const r = fire(createBoard([hack]), coord(0, 0));
    expect(r.ok && r.value.shot.result).toEqual({ kind: 'hit', shipId: 'weekend-hack' });
  });

  it('reports sunk on the last cell of a ship', () => {
    const board = fireAll(createBoard([hack]), [coord(0, 0)]);
    const r = fire(board, coord(0, 1));
    expect(r.ok && r.value.shot.result).toEqual({ kind: 'sunk', shipId: 'weekend-hack' });
  });

  it('reports sunk regardless of the order cells were hit', () => {
    const board = fireAll(createBoard([lib]), [coord(7, 5), coord(5, 5)]);
    const r = fire(board, coord(6, 5));
    expect(r.ok && r.value.shot.result.kind).toBe('sunk');
  });

  it('does not mutate the input board', () => {
    const board = createBoard([hack]);
    fire(board, coord(0, 0));
    expect(board.shots).toHaveLength(0);
  });

  it('rejects a repeat shot', () => {
    const board = fireAll(createBoard([hack]), [coord(3, 3)]);
    expect(fire(board, coord(3, 3))).toEqual({ ok: false, error: 'already-shot' });
  });

  it('rejects an out-of-bounds shot', () => {
    expect(fire(createBoard([hack]), coord(10, 0))).toEqual({ ok: false, error: 'out-of-bounds' });
    expect(fire(createBoard([hack]), coord(0, -1))).toEqual({ ok: false, error: 'out-of-bounds' });
  });
});

describe('sinking and winning', () => {
  it('tracks sunk ships and the whole fleet', () => {
    let board = createBoard([hack, lib]);
    expect(hasBeenShot(board, coord(0, 0))).toBe(false);
    board = fireAll(board, [coord(0, 0), coord(0, 1)]);
    expect(hasBeenShot(board, coord(0, 0))).toBe(true);
    expect(isSunk(board, 'weekend-hack')).toBe(true);
    expect(isSunk(board, 'oss-lib')).toBe(false);
    expect(isFleetSunk(board)).toBe(false);
    board = fireAll(board, [coord(5, 5), coord(6, 5), coord(7, 5)]);
    expect(isFleetSunk(board)).toBe(true);
  });

  it('isSunk is false for a ship not on the board', () => {
    expect(isSunk(createBoard([hack]), 'promotion')).toBe(false);
  });
});

describe('toView', () => {
  it('shows nothing before any shots, so ships stay hidden', () => {
    const view = toView(createBoard([hack, lib]));
    expect(view.cells.flat().every((c) => c === 'unknown')).toBe(true);
    expect(view.remainingShipLengths).toEqual([2, 3]);
  });

  it('distinguishes miss, hit and sunk', () => {
    const board = fireAll(createBoard([hack, lib]), [
      coord(9, 9),
      coord(5, 5),
      coord(0, 0),
      coord(0, 1),
    ]);
    const view = toView(board);
    expect(view.cells[9]?.[9]).toBe('miss');
    expect(view.cells[5]?.[5]).toBe('hit');
    expect(view.cells[0]?.[0]).toBe('sunk');
    expect(view.cells[0]?.[1]).toBe('sunk');
    expect(view.cells[6]?.[5]).toBe('unknown');
    expect(view.remainingShipLengths).toEqual([3]);
  });

  it('is a size × size grid', () => {
    const view = toView(createBoard([hack]));
    expect(view.size).toBe(10);
    expect(view.cells).toHaveLength(10);
    expect(view.cells.every((row) => row.length === 10)).toBe(true);
  });
});
