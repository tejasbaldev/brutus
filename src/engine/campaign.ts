// The chapter flow around individual matches. Pure: the UI renders a stage, the player acts,
// and the campaign moves on. Matches themselves live in match.ts and are never changed here.

export type Chapter = 1 | 2 | 3 | 4;
export type ChapterResult = 'won' | 'lost';
export type Results = Readonly<Partial<Record<1 | 2 | 3, ChapterResult>>>;

/**
 * - intro: the chapter's interstitial
 * - match: a versus match (chapters 1-3)
 * - choice: chapter 4, fight or team up
 * - fight: a short Tier 3 match, interrupted by the incident
 * - escalation: the incident gets worse; the choice comes back
 * - coop: player and AI against the incident
 * - ending: the incident is resolved
 */
export type Stage = 'intro' | 'match' | 'choice' | 'fight' | 'escalation' | 'coop' | 'ending';

export interface CampaignState {
  readonly chapter: Chapter;
  readonly stage: Stage;
  /**
   * Outcomes of chapters 1-3, by chapter. Losing a chapter never ends the game. Chapters skipped
   * with the `?chapter=` shortcut have no entry.
   */
  readonly results: Results;
  /** How many times the player chose to keep fighting in chapter 4. */
  readonly fights: number;
  /** Root seed; every match derives its own from it (see `matchSeed`). */
  readonly seed: number;
}

export type CampaignAction =
  | { readonly type: 'continue' }
  | { readonly type: 'finish-match'; readonly result: ChapterResult }
  | { readonly type: 'choose'; readonly choice: 'fight' | 'team-up' }
  | { readonly type: 'interrupt' }
  | { readonly type: 'resolve' };

/** Rounds (one shot each) in a chapter 4 fight before the incident interrupts it. */
export const FIGHT_ROUNDS = 12;

export const CHAPTERS: readonly Chapter[] = [1, 2, 3, 4];

export function createCampaign(seed: number, chapter: Chapter = 1): CampaignState {
  return { chapter, stage: 'intro', results: {}, fights: 0, seed: seed >>> 0 };
}

export function campaignReducer(state: CampaignState, action: CampaignAction): CampaignState {
  switch (action.type) {
    case 'continue':
      if (state.stage === 'intro') {
        return { ...state, stage: state.chapter === 4 ? 'choice' : 'match' };
      }
      if (state.stage === 'escalation') return { ...state, stage: 'choice' };
      return state;
    case 'finish-match': {
      if (state.stage === 'fight') return escalate(state);
      if (state.stage !== 'match' || state.chapter === 4) return state;
      const results = { ...state.results, [state.chapter]: action.result };
      const chapter = nextChapter(state.chapter);
      return { ...state, chapter, stage: 'intro', results };
    }
    case 'interrupt':
      return state.stage === 'fight' ? escalate(state) : state;
    case 'choose':
      if (state.stage !== 'choice') return state;
      return { ...state, stage: action.choice === 'fight' ? 'fight' : 'coop' };
    case 'resolve':
      return state.stage === 'coop' ? { ...state, stage: 'ending' } : state;
  }
}

const escalate = (state: CampaignState): CampaignState => ({
  ...state,
  stage: 'escalation',
  fights: state.fights + 1,
});

const nextChapter = (c: Chapter): Chapter => (c === 4 ? 4 : ((c + 1) as Chapter));

/** The AI's strength for the current stage: one tier per chapter, Tier 3 from then on. */
export function tierFor(state: CampaignState): 1 | 2 | 3 {
  return state.chapter === 4 ? 3 : state.chapter;
}

/** The previous chapter's outcome, which colours the next interstitial. */
export function previousResult(state: CampaignState): ChapterResult | undefined {
  const previous = state.chapter - 1;
  return previous === 1 || previous === 2 || previous === 3 ? state.results[previous] : undefined;
}

export function wins(state: CampaignState): number {
  return Object.values(state.results).filter((r) => r === 'won').length;
}

/** True once chapters 1-3 have all been played (not skipped with a shortcut). */
export function playedAll(state: CampaignState): boolean {
  return ([1, 2, 3] as const).every((c) => state.results[c] !== undefined);
}

const CHAPTER_4_STAGES: readonly Stage[] = ['choice', 'fight', 'escalation', 'coop', 'ending'];

/**
 * Whether normal play (or a `?chapter=` shortcut) can produce this state. Used to reject
 * tampered or corrupted saves.
 */
export function isReachable(state: CampaignState): boolean {
  const { chapter, stage, results, fights } = state;
  if (stage === 'match' && chapter === 4) return false;
  if (CHAPTER_4_STAGES.includes(stage) && chapter !== 4) return false;
  if (Object.keys(results).some((c) => Number(c) >= chapter)) return false;
  if (fights > 0 && chapter !== 4) return false;
  if (stage === 'escalation' && fights === 0) return false;
  if (stage === 'intro' && chapter === 4 && fights > 0) return false;
  return true;
}

/** A distinct, reproducible seed for each match in the campaign. */
export function matchSeed(state: CampaignState): number {
  const slot = state.chapter * 64 + state.fights * 2 + (state.stage === 'coop' ? 1 : 0);
  return (state.seed ^ Math.imul(slot, 0x9e3779b1)) >>> 0;
}
