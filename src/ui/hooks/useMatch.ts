import { useEffect, useReducer } from 'react';
import { createAi, type AiTier } from '../../ai';
import { INCIDENT_FLEET, STANDARD_FLEET } from '../../engine/fleet';
import {
  boardFiredAtBy,
  createCoopMatch,
  createVersusMatch,
  matchActions,
  matchReducer,
  replayMatch,
  viewFor,
  type MatchMode,
  type MatchState,
} from '../../engine/match';
import { randomPlacement } from '../../engine/placement';
import { createRng } from '../../engine/rng';
import { loadMatch, saveMatch } from '../../persistence/save';

interface Options {
  readonly tier: AiTier;
  readonly seed: number;
  readonly aiDelayMs: number;
  /** 'coop': no placement, both sides fire at a shared incident. */
  readonly mode?: MatchMode;
  /** Identifies this match in storage, so a reload resumes it. Omit to not save. */
  readonly saveId?: string | undefined;
}

/**
 * A fresh stream per AI turn, keyed by how many shots it has fired, so a reload mid-match
 * continues with the same shots. Kept apart from the layout seed so choices don't mirror placement.
 */
function aiRng(seed: number, state: MatchState) {
  const turn = state.log.filter((t) => t.by === 'ai').length;
  return createRng((seed ^ 0x9e3779b9) + Math.imul(turn + 1, 0x85ebca6b));
}

/** Runs one match: the engine reducer, plus the AI taking its turn after a pause. */
export function useMatch({ tier, seed, aiDelayMs, mode = 'versus', saveId }: Options) {
  const [state, dispatch] = useReducer(matchReducer, seed, (s) => {
    const fresh =
      mode === 'coop'
        ? createCoopMatch({ incidentShips: randomPlacement(INCIDENT_FLEET, createRng(s)) })
        : createVersusMatch({ opponentShips: randomPlacement(STANDARD_FLEET, createRng(s)) });
    const saved = saveId === undefined ? undefined : loadMatch(saveId);
    return (saved && replayMatch(fresh, saved)) ?? fresh;
  });

  useEffect(() => {
    if (saveId !== undefined) saveMatch(saveId, matchActions(state));
  }, [state, saveId]);
  useEffect(() => {
    if (state.phase !== 'battle' || state.turn !== 'ai') return;
    const timer = window.setTimeout(() => {
      const ai = createAi(tier, aiRng(seed, state));
      const coord = ai.chooseShot(viewFor(state, 'ai'), boardFiredAtBy(state, 'ai').shots);
      dispatch({ type: 'fire', by: 'ai', coord });
    }, aiDelayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [state, tier, seed, aiDelayMs]);

  return { state, dispatch };
}
