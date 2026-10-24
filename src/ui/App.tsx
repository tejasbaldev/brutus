import { useState } from 'react';
import type { AiTier } from '../ai';
import { useMatch } from './hooks/useMatch';
import { useReducedMotion } from './hooks/useReducedMotion';
import { readDebugParams } from './params';
import { randomSeed } from './random';
import { BattleScreen } from './screens/BattleScreen';
import { PlacementScreen } from './screens/PlacementScreen';
import { TitleScreen } from './screens/TitleScreen';

// Phase 4: a single standalone match. The chapter flow replaces this in Phase 5.
const debug = readDebugParams();

export function App() {
  const reducedMotion = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [game, setGame] = useState(() => ({ id: 0, seed: debug.seed ?? randomSeed() }));

  if (!started) {
    return (
      <TitleScreen
        onBegin={() => {
          setStarted(true);
        }}
      />
    );
  }

  return (
    <Game
      key={game.id}
      seed={game.seed}
      tier={debug.tier ?? 1}
      aiDelayMs={debug.aiDelayMs ?? (reducedMotion ? 250 : 650)}
      onRestart={() => {
        setGame((g) => ({ id: g.id + 1, seed: randomSeed() }));
      }}
    />
  );
}

interface GameProps {
  readonly seed: number;
  readonly tier: AiTier;
  readonly aiDelayMs: number;
  readonly onRestart: () => void;
}

function Game({ seed, tier, aiDelayMs, onRestart }: GameProps) {
  const { state, dispatch } = useMatch({ tier, seed, aiDelayMs });
  return state.phase === 'placement' ? (
    <PlacementScreen state={state} dispatch={dispatch} />
  ) : (
    <BattleScreen state={state} dispatch={dispatch} onRestart={onRestart} />
  );
}
