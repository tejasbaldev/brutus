import { describe, expect, it } from 'vitest';
import { coord, coordKey, inBounds } from './coord';
import { INCIDENT_FLEET, STANDARD_FLEET } from './fleet';
import {
  isFleetComplete,
  placeShip,
  randomPlacement,
  removeShip,
  shipCells,
  validatePlacement,
} from './placement';
import { createRng } from './rng';
import type { ShipPlacement } from './types';

const ship = (
  id: ShipPlacement['id'],
  row: number,
  col: number,
  orientation: 'h' | 'v',
  length: number,
): ShipPlacement => ({ id, origin: coord(row, col), orientation, length });

const fleet = STANDARD_FLEET;

describe('shipCells', () => {
  it('extends right for horizontal ships', () => {
    expect(shipCells(ship('weekend-hack', 3, 4, 'h', 2))).toEqual([coord(3, 4), coord(3, 5)]);
  });

  it('extends down for vertical ships', () => {
    expect(shipCells(ship('oss-lib', 3, 4, 'v', 3))).toEqual([
      coord(3, 4),
      coord(4, 4),
      coord(5, 4),
    ]);
  });
});

describe('validatePlacement', () => {
  it('accepts a ship flush against the far edges', () => {
    expect(validatePlacement([], ship('side-project', 9, 5, 'h', 5), fleet).ok).toBe(true);
    expect(validatePlacement([], ship('side-project', 5, 9, 'v', 5), fleet).ok).toBe(true);
  });

  it.each([
    ['h', 0, 6],
    ['v', 6, 0],
    ['h', -1, 0],
    ['v', 0, -1],
  ] as const)('rejects out-of-bounds %s at (%i, %i)', (orientation, row, col) => {
    expect(validatePlacement([], ship('side-project', row, col, orientation, 5), fleet)).toEqual({
      ok: false,
      error: 'out-of-bounds',
    });
  });

  it('rejects overlap with another ship', () => {
    const placed = [ship('side-project', 0, 0, 'h', 5)];
    expect(validatePlacement(placed, ship('promotion', 0, 4, 'v', 4), fleet)).toEqual({
      ok: false,
      error: 'overlap',
    });
  });

  it('allows ships to touch', () => {
    const placed = [ship('side-project', 0, 0, 'h', 5)];
    expect(validatePlacement(placed, ship('promotion', 1, 0, 'h', 4), fleet).ok).toBe(true);
  });

  it('ignores the ship being moved when checking overlap', () => {
    const placed = [ship('side-project', 0, 0, 'h', 5)];
    expect(validatePlacement(placed, ship('side-project', 0, 1, 'h', 5), fleet).ok).toBe(true);
  });

  it('rejects ships not in the fleet', () => {
    expect(validatePlacement([], ship('memory-leak', 0, 0, 'h', 5), fleet)).toEqual({
      ok: false,
      error: 'unknown-ship',
    });
  });

  it('rejects a length that does not match the spec', () => {
    expect(validatePlacement([], ship('promotion', 0, 0, 'h', 3), fleet)).toEqual({
      ok: false,
      error: 'wrong-length',
    });
  });
});

describe('placeShip / removeShip', () => {
  it('adds a valid ship without mutating the input', () => {
    const placed: ShipPlacement[] = [];
    const result = placeShip(placed, ship('weekend-hack', 0, 0, 'h', 2), fleet);
    expect(result.ok && result.value).toHaveLength(1);
    expect(placed).toHaveLength(0);
  });

  it('replaces an existing ship with the same id', () => {
    const first = placeShip([], ship('weekend-hack', 0, 0, 'h', 2), fleet);
    if (!first.ok) throw new Error('setup');
    const moved = placeShip(first.value, ship('weekend-hack', 5, 5, 'v', 2), fleet);
    expect(moved.ok && moved.value).toEqual([ship('weekend-hack', 5, 5, 'v', 2)]);
  });

  it('returns the validation error for an invalid ship', () => {
    expect(placeShip([], ship('weekend-hack', 0, 9, 'h', 2), fleet)).toEqual({
      ok: false,
      error: 'out-of-bounds',
    });
  });

  it('removes by id', () => {
    const placed = [ship('weekend-hack', 0, 0, 'h', 2), ship('oss-lib', 2, 0, 'h', 3)];
    expect(removeShip(placed, 'weekend-hack')).toEqual([ship('oss-lib', 2, 0, 'h', 3)]);
  });
});

describe('isFleetComplete', () => {
  const full = [
    ship('side-project', 0, 0, 'h', 5),
    ship('promotion', 1, 0, 'h', 4),
    ship('oss-lib', 2, 0, 'h', 3),
    ship('pet-project', 3, 0, 'h', 3),
    ship('weekend-hack', 4, 0, 'h', 2),
  ];

  it('is true when every ship is placed', () => {
    expect(isFleetComplete(full, fleet)).toBe(true);
  });

  it('is false with a ship missing', () => {
    expect(isFleetComplete(full.slice(1), fleet)).toBe(false);
  });

  it('is false when ships overlap', () => {
    const overlapping = [...full.slice(0, 4), ship('weekend-hack', 0, 0, 'v', 2)];
    expect(isFleetComplete(overlapping, fleet)).toBe(false);
  });

  it('is false with a duplicate instead of a missing ship', () => {
    const duplicate = [...full.slice(0, 4), ship('pet-project', 6, 0, 'h', 3)];
    expect(isFleetComplete(duplicate, fleet)).toBe(false);
  });
});

describe('randomPlacement', () => {
  it.each([
    ['standard', STANDARD_FLEET],
    ['incident', INCIDENT_FLEET],
  ] as const)('always produces a complete, valid %s fleet', (_, f) => {
    for (let seed = 0; seed < 500; seed++) {
      const placed = randomPlacement(f, createRng(seed));
      expect(isFleetComplete(placed, f)).toBe(true);
      const cells = placed.flatMap(shipCells);
      expect(cells.every((c) => inBounds(c, 10))).toBe(true);
      expect(new Set(cells.map(coordKey)).size).toBe(17);
    }
  });

  it('is deterministic for a seed', () => {
    expect(randomPlacement(fleet, createRng(123))).toEqual(randomPlacement(fleet, createRng(123)));
  });

  it('varies across seeds', () => {
    const layouts = new Set(
      Array.from({ length: 20 }, (_, seed) =>
        JSON.stringify(randomPlacement(fleet, createRng(seed))),
      ),
    );
    expect(layouts.size).toBe(20);
  });

  it('uses both orientations', () => {
    const orientations = new Set(
      Array.from({ length: 50 }, (_, seed) => randomPlacement(fleet, createRng(seed)))
        .flat()
        .map((p) => p.orientation),
    );
    expect(orientations).toEqual(new Set(['h', 'v']));
  });

  it('throws when a ship cannot fit on the board', () => {
    expect(() => randomPlacement([{ id: 'side-project', length: 5 }], createRng(1), 4)).toThrow(
      RangeError,
    );
  });
});
