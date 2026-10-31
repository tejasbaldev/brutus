// Versioned localStorage saves. Anything unknown or malformed is discarded, never trusted.

import { CHAPTERS, isReachable, type CampaignState, type Stage } from '../engine/campaign';
import type { MatchAction } from '../engine/match';

export const SAVE_KEY = 'brutus:save';
/** Bump on any change to the shape of `CampaignState`. Older saves are then discarded. */
export const SAVE_VERSION = 2;

/** The match in progress, as the actions that rebuild it, so a reload resumes mid-match. */
export const MATCH_KEY = 'brutus:match';
/** Bump on any change to the shape of `MatchAction`. */
export const MATCH_SAVE_VERSION = 1;

export type SaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STAGES: readonly Stage[] = [
  'intro',
  'match',
  'choice',
  'fight',
  'escalation',
  'coop',
  'ending',
];

/** `localStorage`, or undefined where it is blocked. */
export const browserStorage = (): SaveStorage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

export function loadCampaign(storage = browserStorage()): CampaignState | undefined {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return undefined;
    const data: unknown = JSON.parse(raw);
    if (isRecord(data) && data.version === SAVE_VERSION && isCampaign(data.campaign)) {
      return data.campaign;
    }
    storage?.removeItem(SAVE_KEY);
  } catch {
    // Unreadable save or storage: start fresh.
  }
  return undefined;
}

export function saveCampaign(campaign: CampaignState, storage = browserStorage()): void {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, campaign }));
  } catch {
    // Storage full or blocked (e.g. private mode): the game still works, it just won't resume.
  }
}

/**
 * The saved actions for match `id`, or undefined if the save is for another match or malformed.
 * The engine still has to accept every action on replay.
 */
export function loadMatch(
  id: string,
  storage = browserStorage(),
): readonly MatchAction[] | undefined {
  try {
    const raw = storage?.getItem(MATCH_KEY);
    if (!raw) return undefined;
    const data: unknown = JSON.parse(raw);
    if (
      isRecord(data) &&
      data.version === MATCH_SAVE_VERSION &&
      data.id === id &&
      Array.isArray(data.actions) &&
      data.actions.every(isMatchAction)
    ) {
      return data.actions;
    }
  } catch {
    // Unreadable: the match starts fresh.
  }
  return undefined;
}

export function saveMatch(
  id: string,
  actions: readonly MatchAction[],
  storage = browserStorage(),
): void {
  try {
    storage?.setItem(MATCH_KEY, JSON.stringify({ version: MATCH_SAVE_VERSION, id, actions }));
  } catch {
    // Storage full or blocked: the match just won't resume.
  }
}

export function clearSave(storage = browserStorage()): void {
  try {
    storage?.removeItem(SAVE_KEY);
    storage?.removeItem(MATCH_KEY);
  } catch {
    // Nothing to clear.
  }
}

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

const isCount = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;

function isCampaign(x: unknown): x is CampaignState {
  if (!isRecord(x)) return false;
  const { chapter, stage, results, fights, seed } = x;
  const shapeOk =
    CHAPTERS.some((c) => c === chapter) &&
    STAGES.some((s) => s === stage) &&
    isRecord(results) &&
    Object.entries(results).every(
      ([c, r]) => ['1', '2', '3'].includes(c) && (r === 'won' || r === 'lost'),
    ) &&
    isCount(fights) &&
    isCount(seed) &&
    seed <= 0xffffffff;
  return shapeOk && isReachable(x as unknown as CampaignState);
}

const isCoord = (x: unknown): boolean => isRecord(x) && isCount(x.row) && isCount(x.col);

function isMatchAction(x: unknown): x is MatchAction {
  if (!isRecord(x)) return false;
  switch (x.type) {
    case 'start':
      return true;
    case 'fire':
      return (x.by === 'player' || x.by === 'ai') && isCoord(x.coord);
    case 'place': {
      const p = x.placement;
      return (
        isRecord(p) &&
        typeof p.id === 'string' &&
        isCoord(p.origin) &&
        (p.orientation === 'h' || p.orientation === 'v') &&
        isCount(p.length)
      );
    }
    default:
      return false;
  }
}
