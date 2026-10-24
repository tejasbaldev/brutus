import { describe, expect, it } from 'vitest';
import {
  campaignReducer,
  createCampaign,
  isReachable,
  playedAll,
  matchSeed,
  previousResult,
  tierFor,
  wins,
  type CampaignAction,
  type CampaignState,
} from './campaign';

const run = (state: CampaignState, ...actions: CampaignAction[]) =>
  actions.reduce(campaignReducer, state);
const go: CampaignAction = { type: 'continue' };
const won: CampaignAction = { type: 'finish-match', result: 'won' };
const lost: CampaignAction = { type: 'finish-match', result: 'lost' };

describe('campaign', () => {
  it('starts at the chapter 1 interstitial', () => {
    expect(createCampaign(7)).toEqual({
      chapter: 1,
      stage: 'intro',
      results: {},
      fights: 0,
      seed: 7,
    });
  });

  it('runs chapters 1-3 as interstitial then match, recording each outcome', () => {
    const s = run(createCampaign(1), go, won, go, lost, go, won);
    expect(s).toMatchObject({
      chapter: 4,
      stage: 'intro',
      results: { 1: 'won', 2: 'lost', 3: 'won' },
    });
    expect(wins(s)).toBe(2);
  });

  it('never ends the game on a loss', () => {
    const s = run(createCampaign(1), go, lost, go, lost, go, lost);
    expect(s).toMatchObject({ chapter: 4, stage: 'intro' });
    expect(wins(s)).toBe(0);
  });

  it('raises the AI one tier per chapter, and keeps Tier 3 in chapter 4', () => {
    const tiers = [createCampaign(1, 1), createCampaign(1, 2), createCampaign(1, 3)].map(tierFor);
    expect(tiers).toEqual([1, 2, 3]);
    expect(tierFor(createCampaign(1, 4))).toBe(3);
  });

  it('reports the previous chapter result for the next interstitial', () => {
    expect(previousResult(createCampaign(1))).toBeUndefined();
    expect(previousResult(run(createCampaign(1), go, lost))).toBe('lost');
    expect(previousResult(run(createCampaign(1), go, lost, go, won))).toBe('won');
  });

  it('keeps results by chapter when a shortcut skips earlier chapters', () => {
    const s = run(createCampaign(1, 2), go, won);
    expect(s.results).toEqual({ 2: 'won' });
    expect(previousResult(s)).toBe('won');
    expect(previousResult(createCampaign(1, 4))).toBeUndefined();
    expect(playedAll(s)).toBe(false);
    expect(playedAll(run(createCampaign(1), go, won, go, lost, go, lost))).toBe(true);
  });

  it('accepts every state normal play reaches, and rejects impossible ones', () => {
    const fromStart = [createCampaign(1)];
    for (const a of [go, won, go, lost, go, lost, go]) {
      fromStart.push(campaignReducer(fromStart[fromStart.length - 1] ?? createCampaign(1), a));
    }
    const ch4 = run(createCampaign(1, 4), go);
    const loop = [
      run(ch4, { type: 'choose', choice: 'fight' }),
      run(ch4, { type: 'choose', choice: 'fight' }, { type: 'interrupt' }),
      run(ch4, { type: 'choose', choice: 'team-up' }, { type: 'resolve' }),
    ];
    for (const s of [...fromStart, ...loop, createCampaign(1, 3)]) {
      expect(isReachable(s)).toBe(true);
    }
    const base = createCampaign(1);
    const impossible: CampaignState[] = [
      { ...base, stage: 'coop' },
      { ...base, chapter: 4, stage: 'match' },
      { ...base, chapter: 2, results: { 2: 'won' } },
      { ...base, fights: 1 },
      { ...base, chapter: 4, stage: 'escalation' },
    ];
    for (const s of impossible) expect(isReachable(s)).toBe(false);
  });

  it('offers the choice in chapter 4; keep fighting escalates and the choice returns', () => {
    let s = run(createCampaign(1, 4), go);
    expect(s.stage).toBe('choice');
    s = run(s, { type: 'choose', choice: 'fight' });
    expect(s.stage).toBe('fight');
    s = run(s, { type: 'interrupt' });
    expect(s).toMatchObject({ stage: 'escalation', fights: 1 });
    s = run(s, go, { type: 'choose', choice: 'fight' }, lost);
    expect(s).toMatchObject({ stage: 'escalation', fights: 2 });
    expect(run(s, go).stage).toBe('choice');
  });

  it('ends only through co-op', () => {
    const s = run(createCampaign(1, 4), go, { type: 'choose', choice: 'team-up' });
    expect(s.stage).toBe('coop');
    expect(run(s, { type: 'resolve' }).stage).toBe('ending');
  });

  it('ignores actions that do not fit the stage', () => {
    const intro = createCampaign(1);
    for (const action of [
      won,
      { type: 'interrupt' },
      { type: 'resolve' },
      { type: 'choose', choice: 'team-up' },
    ] as const) {
      expect(campaignReducer(intro, action)).toBe(intro);
    }
    const match = run(intro, go);
    expect(campaignReducer(match, go)).toBe(match);
  });

  it('derives a different, stable seed for every match', () => {
    const base = createCampaign(42, 4);
    const fight1 = run(base, go, { type: 'choose', choice: 'fight' });
    const fight2 = run(fight1, { type: 'interrupt' }, go, { type: 'choose', choice: 'fight' });
    const coop = run(fight2, { type: 'interrupt' }, go, { type: 'choose', choice: 'team-up' });
    const seeds = [createCampaign(42, 1), createCampaign(42, 2), fight1, fight2, coop].map(
      matchSeed,
    );
    expect(new Set(seeds).size).toBe(seeds.length);
    expect(matchSeed(fight1)).toBe(matchSeed(run(base, go, { type: 'choose', choice: 'fight' })));
  });
});
