import { useState, type Dispatch } from 'react';
import { hasBeenShot, isSunk } from '../../engine/board';
import { coord } from '../../engine/coord';
import type { MatchAction, MatchState } from '../../engine/match';
import type { Board, Coord } from '../../engine/types';
import { outcome } from '../../story/chapters';
import { describeTurn, ownCell, targetCell } from '../boardModel';
import { FleetList, type FleetEntry } from '../components/FleetList';
import { Grid } from '../components/Grid';
import { useFocusOnMount } from '../hooks/useFocusOnMount';
import styles from './Screen.module.css';

interface Props {
  readonly state: MatchState;
  readonly dispatch: Dispatch<MatchAction>;
  readonly onRestart: () => void;
}

const fleetStatus = (board: Board): FleetEntry[] =>
  board.ships.map((s) => ({
    id: s.id,
    length: s.length,
    status: isSunk(board, s.id) ? 'sunk' : 'afloat',
  }));

export function BattleScreen({ state, dispatch, onRestart }: Props) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const [targetCursor, setTargetCursor] = useState<Coord>(coord(0, 0));
  const [ownCursor, setOwnCursor] = useState<Coord>(coord(0, 0));

  const over = state.phase === 'over';
  const yourTurn = state.phase === 'battle' && state.turn === 'player';
  // The latest two turns: your last shot and its reply stay readable together.
  const recent = state.log.map((turn, index) => ({ turn, index })).slice(-2);

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>~/brutus $ run</p>
        <h1 ref={heading} tabIndex={-1}>
          Battle
        </h1>
        <p className={styles.turn} aria-hidden="true">
          {over ? '> done' : yourTurn ? '> your move' : '> ai is thinking…'}
        </p>
      </header>

      <div className={styles.log} role="log" aria-label="Shots">
        {recent.length === 0 ? (
          <p>Your move. Pick a cell on their board.</p>
        ) : (
          recent.map(({ turn, index }) => <p key={index}>{describeTurn(turn)}</p>)
        )}
      </div>

      {over && state.winner && <GameOver message={outcome[state.winner]} onRestart={onRestart} />}

      <div className={styles.boards}>
        <section aria-labelledby="target-heading" className={styles.boardColumn}>
          <h2 id="target-heading" className={styles.boardHeading}>
            Their board
          </h2>
          <Grid
            label="Their board"
            size={state.size}
            cellAt={(c) => targetCell(state.target, c)}
            cursor={targetCursor}
            onCursorChange={setTargetCursor}
            onActivate={
              yourTurn
                ? (c) => {
                    dispatch({ type: 'fire', by: 'player', coord: c });
                  }
                : undefined
            }
            isDisabled={(c) => hasBeenShot(state.target, c)}
          />
          <FleetList label="Their fleet" ships={fleetStatus(state.target)} />
        </section>

        <section aria-labelledby="own-heading" className={styles.boardColumn}>
          <h2 id="own-heading" className={styles.boardHeading}>
            Your work
          </h2>
          <Grid
            label="Your board"
            size={state.size}
            cellAt={(c) => ownCell(state.player, c)}
            cursor={ownCursor}
            onCursorChange={setOwnCursor}
          />
          <FleetList label="Your fleet" ships={fleetStatus(state.player)} />
        </section>
      </div>
    </main>
  );
}

function GameOver({ message, onRestart }: { message: string; onRestart: () => void }) {
  const button = useFocusOnMount<HTMLButtonElement>();
  return (
    <section className={styles.over} aria-label="Result">
      <p className={styles.verdict}>{message}</p>
      <button ref={button} type="button" className={styles.primary} onClick={onRestart}>
        Play again
      </button>
    </section>
  );
}
