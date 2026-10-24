import { describe, expect, it } from 'vitest';
import { coord, neighbours } from '../engine/coord';
import { createRng } from '../engine/rng';
import { createDensityAi, densityMap } from './tier3-density';
import { viewFrom } from './test-helpers';

const EMPTY = Array.from({ length: 10 }, () => '..........');
const withRow = (index: number, row: string, base = EMPTY) =>
  base.map((r, i) => (i === index ? row : r));

describe('densityMap', () => {
  it('counts placements exactly for a single ship', () => {
    // A length-2 ship on an empty 10×10: a corner fits 2 ways, an edge cell 3, the middle 4.
    const map = densityMap(viewFrom(EMPTY, [2]));
    expect(map[0]?.[0]).toBe(2);
    expect(map[0]?.[5]).toBe(3);
    expect(map[5]?.[5]).toBe(4);
  });

  it('is symmetric on an empty board', () => {
    const map = densityMap(viewFrom(EMPTY));
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        expect(map[r]?.[c]).toBe(map[9 - r]?.[9 - c]);
        expect(map[r]?.[c]).toBe(map[c]?.[r]);
      }
    }
  });

  it('peaks in the centre and is lowest in the corners', () => {
    const map = densityMap(viewFrom(EMPTY));
    const flat = map.flat();
    expect(map[0]?.[0]).toBe(Math.min(...flat));
    expect(Math.max(...flat)).toBe(map[4]?.[4]);
  });

  it('scores zero for any cell that is not unknown', () => {
    const map = densityMap(viewFrom(withRow(0, 'ox#.......'), [5, 4, 3, 3]));
    expect(map[0]?.slice(0, 3)).toEqual([0, 0, 0]);
  });

  it('scores zero where no remaining ship can fit', () => {
    // (0,0) is boxed in by misses; only a length-1 ship could live there, and none remain.
    const rows = withRow(0, '.o........', withRow(1, 'o.........'));
    expect(densityMap(viewFrom(rows, [2]))[0]?.[0]).toBe(0);
  });

  it('respects the remaining ships: a 3-cell gap cannot hold a 4', () => {
    const rows = Array.from({ length: 10 }, () => 'oooooooooo');
    rows[5] = 'ooo...oooo';
    expect(
      densityMap(viewFrom(rows, [4]))
        .flat()
        .every((x) => x === 0),
    ).toBe(true);
    expect(densityMap(viewFrom(rows, [3]))[5]?.slice(3, 6)).toEqual([1, 1, 1]);
  });

  it('weights cells next to an open hit far above the rest', () => {
    const map = densityMap(viewFrom(withRow(4, '....x.....')));
    const around = neighbours(coord(4, 4), 10).map((n) => map[n.row]?.[n.col] ?? 0);
    const far = map[0]?.[9] ?? 0;
    expect(Math.min(...around)).toBeGreaterThan(far * 10);
  });
});

describe('tier 3 choices', () => {
  it('opens near the centre', () => {
    for (let seed = 0; seed < 50; seed++) {
      const c = createDensityAi(createRng(seed)).chooseShot(viewFrom(EMPTY), []);
      expect(c.row).toBeGreaterThanOrEqual(3);
      expect(c.row).toBeLessThanOrEqual(6);
      expect(c.col).toBeGreaterThanOrEqual(3);
      expect(c.col).toBeLessThanOrEqual(6);
    }
  });

  it('follows up a hit with an adjacent cell', () => {
    for (let seed = 0; seed < 50; seed++) {
      const view = viewFrom(withRow(4, '....x.....'));
      const c = createDensityAi(createRng(seed)).chooseShot(view, []);
      expect(neighbours(coord(4, 4), 10)).toContainEqual(c);
    }
  });

  it('extends along a line of hits', () => {
    const view = viewFrom(withRow(4, '...xx.....'));
    const c = createDensityAi(createRng(1)).chooseShot(view, []);
    expect([coord(4, 2), coord(4, 5)]).toContainEqual(c);
  });

  it('picks the one cell only the remaining ship can occupy', () => {
    // Only the 5-ship remains; the sole 5-long gap is row 7, cols 2–6. Its middle wins.
    const rows = Array.from({ length: 10 }, () => 'oooooooooo');
    rows[7] = 'oo.....ooo';
    const c = createDensityAi(createRng(1)).chooseShot(viewFrom(rows, [5]), []);
    expect(c.row).toBe(7);
    expect(c.col).toBeGreaterThanOrEqual(2);
    expect(c.col).toBeLessThanOrEqual(6);
  });
});
