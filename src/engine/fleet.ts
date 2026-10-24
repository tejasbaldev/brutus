import type { ShipSpec } from './types';

// Ids and lengths only. Display names live in src/story/chapters.ts.

/** The engineer's work. The AI fleet uses the same composition. */
export const STANDARD_FLEET: readonly ShipSpec[] = [
  { id: 'side-project', length: 5 },
  { id: 'promotion', length: 4 },
  { id: 'oss-lib', length: 3 },
  { id: 'pet-project', length: 3 },
  { id: 'weekend-hack', length: 2 },
];

/** The shared enemy in the co-op ending. */
export const INCIDENT_FLEET: readonly ShipSpec[] = [
  { id: 'memory-leak', length: 5 },
  { id: 'race-condition', length: 4 },
  { id: 'flaky-test', length: 3 },
  { id: 'dns', length: 3 },
  { id: 'off-by-one', length: 2 },
];
