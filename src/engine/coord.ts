import type { Coord } from './types';

const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const coord = (row: number, col: number): Coord => ({ row, col });

export const sameCoord = (a: Coord, b: Coord): boolean => a.row === b.row && a.col === b.col;

/** Stable string key, for Sets and Maps. */
export const coordKey = (c: Coord): string => `${c.row},${c.col}`;

export const inBounds = (c: Coord, size: number): boolean =>
  Number.isInteger(c.row) &&
  Number.isInteger(c.col) &&
  c.row >= 0 &&
  c.col >= 0 &&
  c.row < size &&
  c.col < size;

/** Orthogonal neighbours that lie on the board, in the order up, right, down, left. */
export function neighbours(c: Coord, size: number): Coord[] {
  return [
    coord(c.row - 1, c.col),
    coord(c.row, c.col + 1),
    coord(c.row + 1, c.col),
    coord(c.row, c.col - 1),
  ].filter((n) => inBounds(n, size));
}

/** Every cell, row by row. */
export function allCoords(size: number): Coord[] {
  const cells: Coord[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) cells.push(coord(row, col));
  }
  return cells;
}

/** Human label: row letter + 1-based column, e.g. { row: 2, col: 4 } → "C5". */
export function toLabel(c: Coord): string {
  const letter = ROW_LETTERS[c.row];
  if (letter === undefined) throw new RangeError(`Row ${c.row} has no letter`);
  return `${letter}${c.col + 1}`;
}

/** Inverse of toLabel. Returns undefined for anything that isn't a valid label. */
export function parseLabel(label: string): Coord | undefined {
  const match = /^([A-Z])([1-9]\d*)$/.exec(label.trim().toUpperCase());
  if (!match?.[1] || !match[2]) return undefined;
  return coord(ROW_LETTERS.indexOf(match[1]), Number(match[2]) - 1);
}
