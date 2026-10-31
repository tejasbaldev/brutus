import { beforeEach, describe, expect, it } from 'vitest';
import { createCampaign } from '../engine/campaign';
import { coord } from '../engine/coord';
import type { MatchAction } from '../engine/match';
import {
  MATCH_KEY,
  MATCH_SAVE_VERSION,
  SAVE_KEY,
  SAVE_VERSION,
  clearSave,
  loadCampaign,
  loadMatch,
  saveCampaign,
  saveMatch,
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

  describe('match', () => {
    const actions: MatchAction[] = [
      {
        type: 'place',
        placement: { id: 'promotion', origin: coord(1, 2), orientation: 'v', length: 4 },
      },
      { type: 'start' },
      { type: 'fire', by: 'player', coord: coord(3, 4) },
    ];

    it('round-trips the actions of the same match', () => {
      saveMatch('1-match-0-42', actions, storage);
      expect(loadMatch('1-match-0-42', storage)).toEqual(actions);
    });

    it('ignores the save of a different match', () => {
      saveMatch('1-match-0-42', actions, storage);
      expect(loadMatch('2-match-0-42', storage)).toBeUndefined();
    });

    it.each([
      ['not JSON', '{oops'],
      ['another version', { version: MATCH_SAVE_VERSION + 1, id: 'm', actions }],
      ['no actions', { version: MATCH_SAVE_VERSION, id: 'm' }],
      ['an unknown action', { version: MATCH_SAVE_VERSION, id: 'm', actions: [{ type: 'nuke' }] }],
      [
        'a bad coordinate',
        {
          version: MATCH_SAVE_VERSION,
          id: 'm',
          actions: [{ type: 'fire', by: 'player', coord: { row: -1, col: 'x' } }],
        },
      ],
    ])('discards %s', (_, data) => {
      storage.setItem(MATCH_KEY, typeof data === 'string' ? data : JSON.stringify(data));
      expect(loadMatch('m', storage)).toBeUndefined();
    });

    it('is cleared with the campaign', () => {
      saveMatch('m', actions, storage);
      clearSave(storage);
      expect(loadMatch('m', storage)).toBeUndefined();
    });
  });
});
