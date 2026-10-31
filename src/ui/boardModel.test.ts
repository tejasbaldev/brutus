import { describe, expect, it } from 'vitest';
import { createBoard, fire } from '../engine/board';
import { coord } from '../engine/coord';
import type { Board, Coord, ShipPlacement } from '../engine/types';
import { describeTurn, ownCell, targetCell } from './boardModel';
import { readDebugParams } from './params';

const hack: ShipPlacement = {
  id: 'weekend-hack',
  origin: coord(0, 0),
  orientation: 'h',
  length: 2,
};

const shoot = (board: Board, ...cells: Coord[]) =>
  cells.reduce((b, c) => {
    const r = fire(b, c);
    if (!r.ok) throw new Error(r.error);
    return r.value.board;
  }, board);

describe('ownCell', () => {
  it('shows your ships, and what has happened to them', () => {
    const board = shoot(createBoard([hack]), coord(5, 5), coord(0, 0));
    expect(ownCell(board, coord(0, 1))).toEqual({ kind: 'ship', description: 'The Weekend Hack' });
    expect(ownCell(board, coord(0, 0))).toEqual({
      kind: 'hit',
      description: 'hit, The Weekend Hack',
    });
    expect(ownCell(board, coord(5, 5))).toEqual({ kind: 'miss', description: 'miss' });
    expect(ownCell(board, coord(9, 9))).toEqual({ kind: 'water', description: 'empty' });
    expect(ownCell(shoot(board, coord(0, 1)), coord(0, 0)).kind).toBe('sunk');
  });
});

describe('targetCell', () => {
  it('never reveals an unhit ship', () => {
    const board = createBoard([hack]);
    expect(targetCell(board, coord(0, 0))).toEqual({ kind: 'water', description: 'not fired at' });
  });

  it('names a ship only once it sinks', () => {
    const hit = shoot(createBoard([hack]), coord(0, 0));
    expect(targetCell(hit, coord(0, 0))).toEqual({ kind: 'hit', description: 'hit' });
    const sunk = shoot(hit, coord(0, 1));
    expect(targetCell(sunk, coord(0, 0))).toEqual({
      kind: 'sunk',
      description: 'sunk, The Weekend Hack',
    });
  });
});

describe('describeTurn', () => {
  it('formats each result', () => {
    const at = coord(2, 4);
    expect(describeTurn({ by: 'player', shot: { coord: at, result: { kind: 'miss' } } })).toBe(
      'You → C5: miss',
    );
    expect(
      describeTurn({ by: 'ai', shot: { coord: at, result: { kind: 'hit', shipId: 'dns' } } }),
    ).toBe('AI → C5: hit');
    expect(
      describeTurn({
        by: 'ai',
        shot: { coord: at, result: { kind: 'sunk', shipId: 'promotion' } },
      }),
    ).toBe('AI → C5: sunk The Promotion');
  });
});

describe('readDebugParams', () => {
  it('reads valid overrides', () => {
    expect(readDebugParams('?tier=3&seed=42&delay=0')).toEqual({
      tier: 3,
      seed: 42,
      aiDelayMs: 0,
    });
  });

  it('ignores missing or invalid values', () => {
    expect(readDebugParams('?tier=4&seed=-1&delay=fast')).toEqual({
      tier: undefined,
      seed: undefined,
      aiDelayMs: undefined,
    });
    expect(readDebugParams('')).toEqual({ tier: undefined, seed: undefined, aiDelayMs: undefined });
  });

  it('ignores AI delays long enough to stall the game', () => {
    expect(readDebugParams('?delay=10000').aiDelayMs).toBe(10_000);
    expect(readDebugParams('?delay=99999999').aiDelayMs).toBeUndefined();
  });
});
