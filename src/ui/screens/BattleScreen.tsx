import { useState, type Dispatch } from 'react';
import { densityMap } from '../../ai';
import { hasBeenShot, isSunk } from '../../engine/board';
import { coord } from '../../engine/coord';
import { viewFor, type MatchAction, type MatchState, type Winner } from '../../engine/match';
import type { Board, Coord } from '../../engine/types';
import { coop as coopCopy, outcome, type Voice } from '../../story/chapters';
import { commentFor } from '../../story/script';
import { describeTurn, ownCell, targetCell } from '../boardModel';
import { FleetList, type FleetEntry } from '../components/FleetList';
import { Grid, type CellModel } from '../components/Grid';
import { useFocusOnMount } from '../hooks/useFocusOnMount';
import styles from './Screen.module.css';

interface Props {
  readonly state: MatchState;
  readonly dispatch: Dispatch<MatchAction>;
  readonly heading?: string;
  /** The AI's commentary voice. Omit for no commentary. */
  readonly voice?: Voice | undefined;
  readonly commentSeed?: number;
  readonly verdict?: (winner: Winner) => string;
  readonly actionLabel?: string;
  /** Called from the result panel: with the winner, or null if the match was interrupted. */
  readonly onDone: (winner: Winner | null) => void;
  /** End the match early, after this many turns (both sides), with `interruptMessage`. */
  readonly interruptAfter?: number | undefined;
  readonly interruptMessage?: string;
}

const fleetStatus = (board: Board): FleetEntry[] =>
  board.ships.map((s) => ({
    id: s.id,
    length: s.length,
    status: isSunk(board, s.id) ? 'sunk' : 'afloat',
  }));

/** The AI's density map, scaled to 0-1, for the co-op hint. */
function heatMap(state: MatchState): number[][] {
  const map = densityMap(viewFor(state, 'player'));
  const max = Math.max(1, ...map.flat());
  return map.map((row) => row.map((v) => v / max));
}

export function BattleScreen({
  state,
  dispatch,
  heading = 'Battle',
  voice,
  commentSeed = 0,
  verdict = (winner) => outcome[winner],
  actionLabel = 'Play again',
  onDone,
  interruptAfter,
  interruptMessage = '',
}: Props) {
  const h1 = useFocusOnMount<HTMLHeadingElement>();
  const [targetCursor, setTargetCursor] = useState<Coord>(coord(0, 0));
  const [ownCursor, setOwnCursor] = useState<Coord>(coord(0, 0));
  const [showHint, setShowHint] = useState(true);

  const coop = state.mode === 'coop';
  const over = state.phase === 'over';
  const interrupted = !over && interruptAfter !== undefined && state.log.length >= interruptAfter;
  const yourTurn = state.phase === 'battle' && state.turn === 'player' && !interrupted;
  // The latest two turns: your last shot and its reply stay readable together.
  const recent = state.log.map((turn, index) => ({ turn, index })).slice(-2);
  const aiTurns = state.log.filter((t) => t.by === 'ai');
  const lastAi = aiTurns[aiTurns.length - 1];
  const comment =
    voice !== undefined && lastAi
      ? commentFor(voice, lastAi.shot.result, aiTurns.length - 1, commentSeed)
      : undefined;

  const heat = coop && showHint && yourTurn ? heatMap(state) : undefined;
  const targetAt = (c: Coord): CellModel => {
    const cell = targetCell(state.target, c);
    const h = heat?.[c.row]?.[c.col];
    return h !== undefined && cell.kind === 'water' ? { ...cell, heat: h } : cell;
  };

  const panel =
    over && state.winner ? verdict(state.winner) : interrupted ? interruptMessage : null;

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>~/brutus $ run</p>
        <h1 ref={h1} tabIndex={-1}>
          {heading}
        </h1>
        <p className={styles.turn} aria-hidden="true">
          {over || interrupted ? '> done' : yourTurn ? '> your move' : '> ai is thinking…'}
        </p>
      </header>

      <div className={styles.log} role="log" aria-label="Shots">
        {recent.length === 0 ? (
          <p>{coop ? coopCopy.opening : 'Your move. Pick a cell on their board.'}</p>
        ) : (
          recent.map(({ turn, index }) => <p key={index}>{describeTurn(turn)}</p>)
        )}
        {comment && <p className={styles.comment}>ai: {comment}</p>}
      </div>

      {panel !== null && (
        <ResultPanel
          message={panel}
          actionLabel={actionLabel}
          onAction={() => {
            onDone(over ? state.winner : null);
          }}
        />
      )}

      <div className={styles.boards}>
        <section aria-labelledby="target-heading" className={styles.boardColumn}>
          <h2 id="target-heading" className={styles.boardHeading}>
            {coop ? coopCopy.board : 'Their board'}
          </h2>
          <Grid
            label={coop ? coopCopy.board : 'Their board'}
            size={state.size}
            cellAt={targetAt}
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
          {coop && (
            <p className={styles.coopHint}>
              {showHint && <span>{coopCopy.hint}</span>}
              <button
                type="button"
                className={styles.linkButton}
                aria-pressed={showHint}
                onClick={() => {
                  setShowHint((v) => !v);
                }}
              >
                {showHint ? 'Hide hint' : 'Show the AI’s hint'}
              </button>
            </p>
          )}
          <FleetList
            label={coop ? coopCopy.board : 'Their fleet'}
            ships={fleetStatus(state.target)}
          />
        </section>

        {!coop && (
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
        )}
      </div>
    </main>
  );
}

interface ResultPanelProps {
  readonly message: string;
  readonly actionLabel: string;
  readonly onAction: () => void;
}

function ResultPanel({ message, actionLabel, onAction }: ResultPanelProps) {
  const button = useFocusOnMount<HTMLButtonElement>();
  return (
    <section className={styles.over} aria-label="Result">
      <p className={styles.verdict}>{message}</p>
      <button ref={button} type="button" className={styles.primary} onClick={onAction}>
        {actionLabel}
      </button>
    </section>
  );
}
