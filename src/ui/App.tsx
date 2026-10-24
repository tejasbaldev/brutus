import { useEffect, useState } from 'react';
import type { AiTier } from '../ai';
import {
  FIGHT_ROUNDS,
  campaignReducer,
  createCampaign,
  matchSeed,
  tierFor,
  type CampaignAction,
  type CampaignState,
} from '../engine/campaign';
import type { MatchMode, Winner } from '../engine/match';
import { clearSave, loadCampaign, saveCampaign } from '../persistence/save';
import { chapters, choice, coop, ending, fight, type Voice } from '../story/chapters';
import { endingLines, escalationFor, introLines } from '../story/script';
import { useMatch } from './hooks/useMatch';
import { useReducedMotion } from './hooks/useReducedMotion';
import { readDebugParams } from './params';
import { randomSeed } from './random';
import { BattleScreen } from './screens/BattleScreen';
import { PlacementScreen } from './screens/PlacementScreen';
import { StoryScreen } from './screens/StoryScreen';
import { TitleScreen } from './screens/TitleScreen';
import styles from './screens/Screen.module.css';

const debug = readDebugParams();

export function App() {
  const reducedMotion = useReducedMotion();
  const aiDelayMs = debug.aiDelayMs ?? (reducedMotion ? 250 : 650);
  const [saved, setSaved] = useState(() => (debug.chapter ? undefined : loadCampaign()));
  // null while on the title screen.
  const [campaign, setCampaign] = useState<CampaignState | null>(null);

  useEffect(() => {
    if (campaign) saveCampaign(campaign);
  }, [campaign]);

  if (!campaign) {
    return (
      <TitleScreen
        onBegin={() => {
          clearSave();
          setCampaign(createCampaign(debug.seed ?? randomSeed(), debug.chapter));
        }}
        onContinue={
          saved
            ? () => {
                setCampaign(saved);
              }
            : undefined
        }
      />
    );
  }

  const dispatch = (action: CampaignAction) => {
    setCampaign((c) => c && campaignReducer(c, action));
  };
  const proceed = () => {
    dispatch({ type: 'continue' });
  };

  return (
    <Stage
      key={stageKey(campaign)}
      campaign={campaign}
      dispatch={dispatch}
      proceed={proceed}
      aiDelayMs={aiDelayMs}
      onRestart={() => {
        clearSave();
        setSaved(undefined);
        setCampaign(null);
      }}
    />
  );
}

const stageKey = (c: CampaignState) => `${c.chapter}-${c.stage}-${c.fights}`;

interface StageProps {
  readonly campaign: CampaignState;
  readonly dispatch: (action: CampaignAction) => void;
  readonly proceed: () => void;
  readonly aiDelayMs: number;
  readonly onRestart: () => void;
}

function Stage({ campaign, dispatch, proceed, aiDelayMs, onRestart }: StageProps) {
  const chapter = chapters[campaign.chapter];
  const tier: AiTier = debug.tier ?? tierFor(campaign);
  const seed = matchSeed(campaign);
  const continueButton = (
    <button type="button" className={styles.primary} onClick={proceed}>
      Continue
    </button>
  );

  switch (campaign.stage) {
    case 'intro':
      return (
        <StoryScreen eyebrow={chapter.eyebrow} heading={chapter.title} lines={introLines(campaign)}>
          {continueButton}
        </StoryScreen>
      );
    case 'match':
      return (
        <Match
          mode="versus"
          tier={tier}
          seed={seed}
          aiDelayMs={aiDelayMs}
          heading={chapter.title}
          voice={tier}
          verdict={(winner) => (winner === 'player' ? chapter.verdict.won : chapter.verdict.lost)}
          onDone={(winner) => {
            dispatch({ type: 'finish-match', result: winner === 'player' ? 'won' : 'lost' });
          }}
        />
      );
    case 'choice':
      return (
        <StoryScreen eyebrow={chapter.eyebrow} heading={choice.heading} lines={choice.lines}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              dispatch({ type: 'choose', choice: 'team-up' });
            }}
          >
            {choice.teamUp}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              dispatch({ type: 'choose', choice: 'fight' });
            }}
          >
            {choice.fight}
          </button>
        </StoryScreen>
      );
    case 'fight':
      return (
        <Match
          mode="versus"
          tier={tier}
          seed={seed}
          aiDelayMs={aiDelayMs}
          heading={fight.heading}
          voice={tier}
          verdict={() => fight.interrupted}
          interruptAfter={FIGHT_ROUNDS * 2}
          interruptMessage={fight.interrupted}
          onDone={() => {
            dispatch({ type: 'interrupt' });
          }}
        />
      );
    case 'escalation': {
      const step = escalationFor(campaign);
      return (
        <StoryScreen eyebrow={step.eyebrow} heading={fight.escalationHeading} lines={step.lines}>
          {continueButton}
        </StoryScreen>
      );
    }
    case 'coop':
      return (
        <Match
          mode="coop"
          tier={tier}
          seed={seed}
          aiDelayMs={aiDelayMs}
          heading={coop.heading}
          voice="coop"
          verdict={() => coop.verdict}
          onDone={() => {
            dispatch({ type: 'resolve' });
          }}
        />
      );
    case 'ending':
      return (
        <StoryScreen
          eyebrow={ending.eyebrow}
          heading={ending.heading}
          lines={endingLines(campaign)}
        >
          <button type="button" className={styles.secondary} onClick={onRestart}>
            Start over
          </button>
        </StoryScreen>
      );
  }
}

interface MatchProps {
  readonly mode: MatchMode;
  readonly tier: AiTier;
  readonly seed: number;
  readonly aiDelayMs: number;
  readonly heading: string;
  readonly voice: Voice;
  readonly verdict: (winner: Winner) => string;
  readonly onDone: (winner: Winner | null) => void;
  readonly interruptAfter?: number;
  readonly interruptMessage?: string;
}

function Match({ mode, tier, seed, aiDelayMs, ...battle }: MatchProps) {
  const { state, dispatch } = useMatch({ tier, seed, aiDelayMs, mode });
  return state.phase === 'placement' ? (
    <PlacementScreen state={state} dispatch={dispatch} />
  ) : (
    <BattleScreen
      state={state}
      dispatch={dispatch}
      commentSeed={seed}
      actionLabel="Continue"
      {...battle}
    />
  );
}
