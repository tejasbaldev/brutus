import { describe, expect, it } from 'vitest';
import { campaignReducer, createCampaign, type CampaignAction } from '../engine/campaign';
import { chapters, commentary, ending, escalations, shipNames } from './chapters';
import { commentFor, endingLines, escalationFor, introLines } from './script';

const go: CampaignAction = { type: 'continue' };
const fin = (result: 'won' | 'lost'): CampaignAction => ({ type: 'finish-match', result });

describe('story script', () => {
  it('keeps every interstitial to 2-4 lines', () => {
    for (const { intro } of Object.values(chapters)) {
      const versions = 'afterWin' in intro ? [intro.afterWin, intro.afterLoss] : [intro];
      for (const lines of versions) expect(lines.length).toBeGreaterThanOrEqual(2);
      for (const lines of versions) expect(lines.length).toBeLessThanOrEqual(4);
    }
  });

  it('colours the next interstitial with the previous outcome', () => {
    const c2 = chapters[2].intro;
    if (!('afterWin' in c2)) throw new Error('chapter 2 should vary');
    const afterWin = [go, fin('won')].reduce(campaignReducer, createCampaign(1));
    const afterLoss = [go, fin('lost')].reduce(campaignReducer, createCampaign(1));
    expect(introLines(afterWin)).toBe(c2.afterWin);
    expect(introLines(afterLoss)).toBe(c2.afterLoss);
    expect(introLines(createCampaign(1))).toBe(chapters[1].intro);
  });

  it('escalates with each fight, then holds at the last step', () => {
    const at = (fights: number) => escalationFor({ ...createCampaign(1, 4), fights });
    expect(at(1)).toBe(escalations[0]);
    expect(at(2)).toBe(escalations[1]);
    expect(at(99)).toBe(escalations[escalations.length - 1]);
  });

  it('reflects the record in the ending', () => {
    const results = ['won', 'lost', 'won'] as const;
    const lines = endingLines({ ...createCampaign(1, 4), results, fights: 0 });
    expect(lines).toContain(ending.record[2]);
    expect(lines).not.toContain(ending.foughtOn);
    expect(endingLines({ ...createCampaign(1, 4), fights: 2 })).toContain(ending.foughtOn);
  });

  it('has lines for every voice and result', () => {
    for (const voice of Object.values(commentary)) {
      expect(voice.miss.length).toBeGreaterThan(0);
      expect(voice.hit.length).toBeGreaterThan(0);
      expect(voice.sunk.every((l) => l.includes('{ship}'))).toBe(true);
    }
  });

  it('picks comments deterministically and names sunk ships', () => {
    const miss = { kind: 'miss' } as const;
    expect(commentFor(1, miss, 3)).toBe(commentFor(1, miss, 3));
    expect(commentary[2].miss).toContain(commentFor(2, miss, 5, 9));
    const line = commentFor(3, { kind: 'sunk', shipId: 'promotion' }, 0);
    expect(line).toContain(shipNames.promotion);
    expect(line).not.toContain('{ship}');
  });
});
