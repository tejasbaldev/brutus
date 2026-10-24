import { hasBeenShot, isSunk, shipAt } from '../engine/board';
import { toLabel } from '../engine/coord';
import type { TurnRecord } from '../engine/match';
import type { Board, Coord } from '../engine/types';
import { shipNames } from '../story/chapters';
import type { CellModel } from './components/Grid';

/** Your own board: ships visible, plus every shot the AI has taken. */
export function ownCell(board: Board, c: Coord): CellModel {
  const ship = shipAt(board, c);
  const shot = hasBeenShot(board, c);
  if (!ship)
    return shot ? { kind: 'miss', description: 'miss' } : { kind: 'water', description: 'empty' };
  const name = shipNames[ship.id];
  if (!shot) return { kind: 'ship', description: name };
  return isSunk(board, ship.id)
    ? { kind: 'sunk', description: `sunk, ${name}` }
    : { kind: 'hit', description: `hit, ${name}` };
}

/** The board you fire at: only what you have learned. Sunk ships reveal their names. */
export function targetCell(board: Board, c: Coord): CellModel {
  if (!hasBeenShot(board, c)) return { kind: 'water', description: 'not fired at' };
  const ship = shipAt(board, c);
  if (!ship) return { kind: 'miss', description: 'miss' };
  return isSunk(board, ship.id)
    ? { kind: 'sunk', description: `sunk, ${shipNames[ship.id]}` }
    : { kind: 'hit', description: 'hit' };
}

/** A terse log line for the status region, e.g. "You → C5: hit". */
export function describeTurn({ by, shot }: TurnRecord): string {
  const who = by === 'player' ? 'You' : 'AI';
  const at = toLabel(shot.coord);
  const { result } = shot;
  if (result.kind === 'miss') return `${who} → ${at}: miss`;
  if (result.kind === 'hit') return `${who} → ${at}: hit`;
  return `${who} → ${at}: sunk ${shipNames[result.shipId]}`;
}
