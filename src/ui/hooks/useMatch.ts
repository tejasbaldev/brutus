import { useEffect, useMemo, useReducer } from 'react';
import { createAi, type AiTier } from '../../ai';
import { STANDARD_FLEET } from '../../engine/fleet';
import { boardFiredAtBy, createVersusMatch, matchReducer, viewFor } from '../../engine/match';
import { randomPlacement } from '../../engine/placement';
import { createRng } from '../../engine/rng';

interface Options {
  readonly tier: AiTier;
  readonly seed: number;
  readonly aiDelayMs: number;
}

/** Runs one versus match: the engine reducer, plus the AI taking its turn after a pause. */
export function useMatch({ tier, seed, aiDelayMs }: Options) {
  const [state, dispatch] = useReducer(matchReducer, seed, (s) =>
    createVersusMatch({ opponentShips: randomPlacement(STANDARD_FLEET, createRng(s)) }),
  );
  // A separate stream from the layout seed, so the AI's choices don't mirror its placement.
  const ai = useMemo(() => createAi(tier, createRng(seed ^ 0x9e3779b9)), [tier, seed]);

  useEffect(() => {
    if (state.phase !== 'battle' || state.turn !== 'ai') return;
    const timer = window.setTimeout(() => {
      const coord = ai.chooseShot(viewFor(state, 'ai'), boardFiredAtBy(state, 'ai').shots);
      dispatch({ type: 'fire', by: 'ai', coord });
    }, aiDelayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [state, ai, aiDelayMs]);

  return { state, dispatch };
}
