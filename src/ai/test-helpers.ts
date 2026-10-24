// Test-only helpers. Not imported by app code.
import { fire, createBoard, isFleetSunk, toView } from '../engine/board';
import { inBounds } from '../engine/coord';
import type { ShipPlacement } from '../engine/types';
import type { Ai, BoardView, CellView } from './types';

const SYMBOLS: Record<string, CellView> = { '.': 'unknown', o: 'miss', x: 'hit', '#': 'sunk' };

/**
 * Builds a view from rows of symbols: `.` unknown, `o` miss, `x` hit, `#` sunk.
 * Whitespace inside a row is ignored, so rows can be spaced for readability.
 */
export function viewFrom(
  rows: string[],
  remainingShipLengths: number[] = [5, 4, 3, 3, 2],
): BoardView {
  const cells = rows.map((r) =>
    r
      .replace(/\s/g, '')
      .split('')
      .map((ch) => {
        const cell = SYMBOLS[ch];
        if (!cell) throw new Error(`Unknown symbol "${ch}"`);
        return cell;
      }),
  );
  if (cells.some((row) => row.length !== cells.length)) throw new Error('View must be square');
  return { size: cells.length, cells, remainingShipLengths };
}

/**
 * Lets an AI fire at a fixed layout until everything sinks. Fails loudly if the AI ever
 * fires out of bounds or at a cell it already knows. Returns the number of shots taken.
 */
export function shotsToSinkAll(ai: Ai, ships: readonly ShipPlacement[], size = 10): number {
  let board = createBoard(ships, size);
  let shots = 0;
  while (!isFleetSunk(board)) {
    const view = toView(board);
    const c = ai.chooseShot(view, board.shots);
    if (!inBounds(c, size)) throw new Error(`Tier ${ai.tier} fired out of bounds`);
    if (view.cells[c.row]?.[c.col] !== 'unknown') {
      throw new Error(`Tier ${ai.tier} fired at a known cell ${c.row},${c.col}`);
    }
    const result = fire(board, c);
    if (!result.ok) throw new Error(result.error);
    board = result.value.board;
    shots++;
    if (shots > size * size) throw new Error('AI never finished');
  }
  return shots;
}
