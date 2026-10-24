// All player-facing story copy lives here. Edit freely: no logic depends on the wording.
// (Button labels and screen-reader hints are UI chrome and live in the components.)

import type { ShipId } from '../engine/types';

export const shipNames: Record<ShipId, string> = {
  'side-project': 'The Side Project',
  promotion: 'The Promotion',
  'oss-lib': 'The Open-Source Lib',
  'pet-project': 'The Pet Project',
  'weekend-hack': 'The Weekend Hack',
  'memory-leak': 'Memory Leak',
  'race-condition': 'Race Condition',
  'flaky-test': 'Flaky Test',
  dns: "It's Always DNS",
  'off-by-one': 'Off-by-One',
};

export const title = {
  heading: 'Engineers vs AI',
  lede: 'A game of Battleship about the work you love, and who else can do it.',
};

export const placement = {
  heading: 'Lay out your work',
  lede: 'Everything you have built, somewhere on this grid. Put it where you think it is safe.',
};

/** One-line verdicts at the end of a match. */
export const outcome = {
  player: 'You shipped it. Every one of theirs, down.',
  ai: 'It found all of it. Every project, every weekend.',
  team: 'Incident resolved. Nobody did it alone.',
};
