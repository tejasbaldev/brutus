import { describe, expect, it } from 'vitest';
import {
  allCoords,
  coord,
  coordKey,
  inBounds,
  neighbours,
  parseLabel,
  sameCoord,
  toLabel,
} from './coord';

describe('inBounds', () => {
  it('accepts corners and rejects anything outside', () => {
    expect(inBounds(coord(0, 0), 10)).toBe(true);
    expect(inBounds(coord(9, 9), 10)).toBe(true);
    expect(inBounds(coord(-1, 0), 10)).toBe(false);
    expect(inBounds(coord(0, 10), 10)).toBe(false);
    expect(inBounds(coord(10, 0), 10)).toBe(false);
  });

  it('rejects non-integers', () => {
    expect(inBounds(coord(1.5, 2), 10)).toBe(false);
    expect(inBounds(coord(Number.NaN, 2), 10)).toBe(false);
  });
});

describe('neighbours', () => {
  it('returns four orthogonal neighbours in the middle', () => {
    expect(neighbours(coord(5, 5), 10)).toEqual([
      coord(4, 5),
      coord(5, 6),
      coord(6, 5),
      coord(5, 4),
    ]);
  });

  it('drops off-board neighbours at a corner', () => {
    expect(neighbours(coord(0, 0), 10)).toEqual([coord(0, 1), coord(1, 0)]);
  });
});

describe('allCoords', () => {
  it('lists every cell once', () => {
    const cells = allCoords(10);
    expect(cells).toHaveLength(100);
    expect(new Set(cells.map(coordKey)).size).toBe(100);
  });
});

describe('labels', () => {
  it('formats row letter + 1-based column', () => {
    expect(toLabel(coord(0, 0))).toBe('A1');
    expect(toLabel(coord(2, 4))).toBe('C5');
    expect(toLabel(coord(9, 9))).toBe('J10');
  });

  it('round-trips every cell', () => {
    for (const c of allCoords(10)) expect(parseLabel(toLabel(c))).toEqual(c);
  });

  it('parses case-insensitively and rejects junk', () => {
    expect(parseLabel(' c5 ')).toEqual(coord(2, 4));
    expect(parseLabel('A0')).toBeUndefined();
    expect(parseLabel('5C')).toBeUndefined();
    expect(parseLabel('')).toBeUndefined();
  });
});

describe('sameCoord / coordKey', () => {
  it('compares by value', () => {
    expect(sameCoord(coord(1, 2), coord(1, 2))).toBe(true);
    expect(sameCoord(coord(1, 2), coord(2, 1))).toBe(false);
    expect(coordKey(coord(1, 2))).not.toBe(coordKey(coord(2, 1)));
  });
});
