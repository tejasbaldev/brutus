import { useState, type Dispatch } from 'react';
import { createBoard, shipAt } from '../../engine/board';
import { coord, coordKey, toLabel } from '../../engine/coord';
import type { MatchAction, MatchState } from '../../engine/match';
import {
  isFleetComplete,
  shipCells,
  validatePlacement,
  type PlacementError,
} from '../../engine/placement';
import type { Coord, Orientation, ShipId, ShipPlacement } from '../../engine/types';
import { placement as copy, shipNames } from '../../story/chapters';
import { ownCell } from '../boardModel';
import { FleetList } from '../components/FleetList';
import { Grid, type CellModel } from '../components/Grid';
import { useFocusOnMount } from '../hooks/useFocusOnMount';
import { randomSeed } from '../random';
import styles from './Screen.module.css';

interface Props {
  readonly state: MatchState;
  readonly dispatch: Dispatch<MatchAction>;
}

const ERROR_TEXT: Record<PlacementError, string> = {
  'out-of-bounds': "Doesn't fit there.",
  overlap: 'That overlaps another ship.',
  'unknown-ship': 'Unknown ship.',
  'wrong-length': 'Wrong length.',
};

const ORIENTATION_TEXT: Record<Orientation, string> = { h: 'across', v: 'down' };

export function PlacementScreen({ state, dispatch }: Props) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const [selected, setSelected] = useState<ShipId | null>(state.fleet[0]?.id ?? null);
  const [orientation, setOrientation] = useState<Orientation>('h');
  const [cursor, setCursor] = useState<Coord>(coord(0, 0));
  const [message, setMessage] = useState('');

  const spec = state.fleet.find((s) => s.id === selected);
  const candidate: ShipPlacement | null = spec
    ? { id: spec.id, origin: cursor, orientation, length: spec.length }
    : null;
  const valid = candidate
    ? validatePlacement(state.placing, candidate, state.fleet, state.size).ok
    : false;
  const preview = new Set(candidate ? shipCells(candidate).map(coordKey) : []);
  const board = createBoard(state.placing, state.size);
  const complete = isFleetComplete(state.placing, state.fleet, state.size);

  const cellAt = (c: Coord): CellModel => {
    const base = ownCell(board, c);
    if (!preview.has(coordKey(c))) return base;
    return { ...base, overlay: valid ? 'preview' : 'invalid' };
  };

  const nextUnplaced = (justPlaced: ShipId): ShipId | null =>
    state.fleet.find((s) => s.id !== justPlaced && !state.placing.some((p) => p.id === s.id))?.id ??
    null;

  const rotate = () => {
    const next = orientation === 'h' ? 'v' : 'h';
    setOrientation(next);
    setMessage(`Rotated: ${ORIENTATION_TEXT[next]}.`);
  };

  const activate = (c: Coord) => {
    if (!spec) {
      const ship = shipAt(board, c);
      if (ship) {
        setSelected(ship.id);
        setOrientation(ship.orientation);
        setMessage(`Moving ${shipNames[ship.id]}. Choose a new spot.`);
      }
      return;
    }
    const placement: ShipPlacement = { id: spec.id, origin: c, orientation, length: spec.length };
    const check = validatePlacement(state.placing, placement, state.fleet, state.size);
    if (!check.ok) {
      setMessage(ERROR_TEXT[check.error]);
      return;
    }
    dispatch({ type: 'place', placement });
    setSelected(nextUnplaced(spec.id));
    setMessage(`Placed ${shipNames[spec.id]} at ${toLabel(c)}, ${ORIENTATION_TEXT[orientation]}.`);
  };

  const onCommandKey = (key: string) => {
    if (key === 'r' || key === 'R') {
      rotate();
      return true;
    }
    if (key === 'Escape' && selected) {
      setSelected(null);
      setMessage('Nothing selected. Choose a placed ship on the board to move it.');
      return true;
    }
    return false;
  };

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>~/brutus $ plan</p>
        <h1 ref={heading} tabIndex={-1}>
          {copy.heading}
        </h1>
        <p className={styles.lede}>{copy.lede}</p>
      </header>

      <div className={styles.layout}>
        <section aria-labelledby="own-board-heading">
          <h2 id="own-board-heading" className={styles.boardHeading}>
            Your work
          </h2>
          <Grid
            label="Your board"
            size={state.size}
            cellAt={cellAt}
            cursor={cursor}
            onCursorChange={setCursor}
            onActivate={activate}
            onCommandKey={onCommandKey}
          />
          <p className={styles.hint}>
            Arrow keys to move · <kbd>R</kbd> to rotate · <kbd>Enter</kbd> to place · <kbd>Esc</kbd>{' '}
            to deselect
          </p>
        </section>

        <aside className={styles.side}>
          <FleetList
            label="Fleet"
            ships={state.fleet.map((s) => ({
              id: s.id,
              length: s.length,
              status: state.placing.some((p) => p.id === s.id) ? 'placed' : 'unplaced',
            }))}
            selected={selected}
            onSelect={(id) => {
              setSelected(id);
              setMessage(`${shipNames[id]} selected. Choose a spot on the board.`);
            }}
          />
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={rotate}>
              Rotate ({ORIENTATION_TEXT[orientation]})
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                dispatch({ type: 'autoPlace', seed: randomSeed() });
                setSelected(null);
                setMessage('Placed everything at random.');
              }}
            >
              Shuffle
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={!complete}
              onClick={() => {
                dispatch({ type: 'start' });
              }}
            >
              Start
            </button>
          </div>
          <p className={styles.status} role="status">
            {message}
          </p>
        </aside>
      </div>
    </main>
  );
}
