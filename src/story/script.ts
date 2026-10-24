// Picks which lines from chapters.ts to show. No copy here, only selection.

import { previousResult, wins, type CampaignState } from '../engine/campaign';
import type { ShotResult } from '../engine/types';
import { chapters, commentary, ending, escalations, shipNames, type Voice } from './chapters';

/** The current chapter's interstitial, coloured by the previous chapter's outcome. */
export function introLines(state: CampaignState): readonly string[] {
  const { intro } = chapters[state.chapter];
  if (!('afterWin' in intro)) return intro;
  return previousResult(state) === 'won' ? intro.afterWin : intro.afterLoss;
}

/** The escalation after the latest "keep fighting" round. */
export function escalationFor(state: CampaignState) {
  const index = Math.min(Math.max(state.fights - 1, 0), escalations.length - 1);
  return escalations[index] ?? { eyebrow: '', lines: [] };
}

export function endingLines(state: CampaignState): readonly string[] {
  return [
    ...ending.lines,
    ending.record[wins(state)] ?? '',
    ...(state.fights > 0 ? [ending.foughtOn] : []),
    ending.closing,
  ].filter((line) => line !== '');
}

/** The AI's line for its `turn`-th shot. Deterministic for a given seed. */
export function commentFor(voice: Voice, result: ShotResult, turn: number, seed = 0): string {
  const pool = commentary[voice][result.kind];
  const line = pool[(turn + seed) % pool.length] ?? '';
  return result.kind === 'sunk' ? line.replaceAll('{ship}', shipNames[result.shipId]) : line;
}
