// Versioned localStorage saves. Anything unknown or malformed is discarded, never trusted.

import { CHAPTERS, isReachable, type CampaignState, type Stage } from '../engine/campaign';

export const SAVE_KEY = 'brutus:save';
/** Bump on any change to the shape of `CampaignState`. Older saves are then discarded. */
export const SAVE_VERSION = 2;

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

export function clearSave(storage = browserStorage()): void {
  try {
    storage?.removeItem(SAVE_KEY);
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
