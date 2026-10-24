import { beforeEach, describe, expect, it } from 'vitest';
import { createCampaign } from '../engine/campaign';
import {
  SAVE_KEY,
  SAVE_VERSION,
  clearSave,
  loadCampaign,
  saveCampaign,
  type SaveStorage,
} from './save';

class MemoryStorage implements SaveStorage {
  readonly items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

describe('save', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('round-trips a campaign', () => {
    const campaign = { ...createCampaign(99, 3), results: { 1: 'won', 2: 'lost' } as const };
    saveCampaign(campaign, storage);
    expect(loadCampaign(storage)).toEqual(campaign);
  });

  it('returns nothing when there is no save', () => {
    expect(loadCampaign(storage)).toBeUndefined();
  });

  it.each([
    ['not JSON', '{oops'],
    ['an old version', JSON.stringify({ version: SAVE_VERSION - 1, campaign: createCampaign(1) })],
    [
      'a future version',
      JSON.stringify({ version: SAVE_VERSION + 1, campaign: createCampaign(1) }),
    ],
    [
      'a bad chapter',
      JSON.stringify({ version: SAVE_VERSION, campaign: { ...createCampaign(1), chapter: 9 } }),
    ],
    [
      'a bad stage',
      JSON.stringify({ version: SAVE_VERSION, campaign: { ...createCampaign(1), stage: 'boss' } }),
    ],
    [
      'bad results',
      JSON.stringify({
        version: SAVE_VERSION,
        campaign: { ...createCampaign(1), results: ['tie'] },
      }),
    ],
    [
      'a negative count',
      JSON.stringify({ version: SAVE_VERSION, campaign: { ...createCampaign(1), fights: -1 } }),
    ],
    ['no campaign', JSON.stringify({ version: SAVE_VERSION })],
    [
      'an unreachable stage',
      JSON.stringify({ version: SAVE_VERSION, campaign: { ...createCampaign(1), stage: 'coop' } }),
    ],
    [
      'a result for a chapter not yet played',
      JSON.stringify({
        version: SAVE_VERSION,
        campaign: { ...createCampaign(1, 2), results: { 3: 'won' } },
      }),
    ],
  ])('discards %s', (_, raw) => {
    storage.setItem(SAVE_KEY, raw);
    expect(loadCampaign(storage)).toBeUndefined();
  });

  it('removes a discarded save so it is not re-read', () => {
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 0 }));
    loadCampaign(storage);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('clears the save', () => {
    saveCampaign(createCampaign(1), storage);
    clearSave(storage);
    expect(loadCampaign(storage)).toBeUndefined();
  });

  it('survives storage that throws', () => {
    const broken: SaveStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => {
      saveCampaign(createCampaign(1), broken);
    }).not.toThrow();
    expect(loadCampaign(broken)).toBeUndefined();
  });
});
