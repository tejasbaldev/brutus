import { describe, expect, it } from 'vitest';
import { coord, coordKey, neighbours } from '../engine/coord';
import { createRng } from '../engine/rng';
import { createHuntTargetAi, targetCandidates } from './tier2-hunt-target';
import { viewFrom } from './test-helpers';
import { cellAt } from './view';

const keys = (cells: { row: number; col: number }[]) => cells.map(coordKey).sort();

const EMPTY = Array.from({ length: 10 }, () => '..........');
const withRow = (index: number, row: string, base = EMPTY) =>
  base.map((r, i) => (i === index ? row : r));

describe('hunt mode', () => {
  it('fires on the checkerboard when it has no open hits', () => {
    for (let seed = 0; seed < 200; seed++) {
      const c = createHuntTargetAi(createRng(seed)).chooseShot(viewFrom(EMPTY), []);
      expect((c.row + c.col) % 2).toBe(0);
    }
  });

  it('ignores sunk ships: sunk cells are not leads', () => {
    const view = viewFrom(withRow(0, '##........'), [5, 4, 3, 3]);
    expect(targetCandidates(view)).toEqual([]);
  });

  it('falls back to any unknown cell when the checkerboard is exhausted', () => {
    // Every even-parity cell is a miss; only odd-parity cells remain.
    const rows = Array.from({ length: 10 }, (_, r) =>
      Array.from({ length: 10 }, (_, c) => ((r + c) % 2 === 0 ? 'o' : '.')).join(''),
    );
    const c = createHuntTargetAi(createRng(1)).chooseShot(viewFrom(rows, [2]), []);
    expect((c.row + c.col) % 2).toBe(1);
  });
});

describe('target mode', () => {
  it('probes the four neighbours of a lone hit', () => {
    const view = viewFrom(withRow(4, '....x.....'));
    expect(keys(targetCandidates(view))).toEqual(keys(neighbours(coord(4, 4), 10)));
  });

  it('only probes neighbours that are still unknown', () => {
    const rows = withRow(4, '...oxo....', withRow(3, '....o.....'));
    expect(targetCandidates(viewFrom(rows))).toEqual([coord(5, 4)]);
  });

  it('extends a line of hits from both ends instead of probing sideways', () => {
    const view = viewFrom(withRow(4, '...xx.....'));
    expect(keys(targetCandidates(view))).toEqual(keys([coord(4, 2), coord(4, 5)]));
  });

  it('extends vertically too', () => {
    const rows = withRow(3, '.....x....', withRow(4, '.....x....'));
    expect(keys(targetCandidates(viewFrom(rows)))).toEqual(keys([coord(2, 5), coord(5, 5)]));
  });

  it('keeps extending past a blocked end', () => {
    const view = viewFrom(withRow(4, '..oxxx....'));
    expect(targetCandidates(view)).toEqual([coord(4, 6)]);
  });

  it('falls back to neighbours when both ends of a line are blocked', () => {
    // Two hits side by side with misses at both ends: they must be two different ships.
    const view = viewFrom(withRow(4, '...oxxo...'));
    expect(keys(targetCandidates(view))).toEqual(
      keys([coord(3, 4), coord(5, 4), coord(3, 5), coord(5, 5)]),
    );
  });

  it('always probes a cell adjacent to an open hit (property)', () => {
    const rng = createRng(42);
    for (let trial = 0; trial < 500; trial++) {
      // A random board: ~30% misses, one to three scattered hits.
      const rows = Array.from({ length: 10 }, () =>
        Array.from({ length: 10 }, () => (rng() < 0.3 ? 'o' : '.')).join(''),
      );
      const hitCount = 1 + Math.floor(rng() * 3);
      const grid = rows.map((r) => r.split(''));
      for (let i = 0; i < hitCount; i++) {
        const row = grid[Math.floor(rng() * 10)];
        if (row) row[Math.floor(rng() * 10)] = 'x';
      }
      const view = viewFrom(grid.map((r) => r.join('')));
      const hits = new Set(
        grid.flatMap((r, ri) => r.map((ch, ci) => (ch === 'x' ? coordKey(coord(ri, ci)) : ''))),
      );
      const hasUnknownNeighbour = [...hits].filter(Boolean).some((k) => {
        const [r, c] = k.split(',').map(Number);
        return neighbours(coord(r ?? 0, c ?? 0), 10).some((n) => cellAt(view, n) === 'unknown');
      });
      if (!hasUnknownNeighbour) continue;

      const shot = createHuntTargetAi(createRng(trial)).chooseShot(view, []);
      const adjacent = neighbours(shot, 10).some((n) => cellAt(view, n) === 'hit');
      expect(adjacent, `trial ${trial}`).toBe(true);
    }
  });
});
