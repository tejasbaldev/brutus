import { createContext, useContext, useEffect, useRef } from 'react';
import type { TurnRecord } from '../../engine/match';
import { playShot } from '../sound';

/** Whether the player turned sound on. Off unless they do. */
export const SoundContext = createContext(false);

/** Plays a cue for each new shot in the log (never for shots already there on mount). */
export function useShotSound(log: readonly TurnRecord[]): void {
  const enabled = useContext(SoundContext);
  const heard = useRef(log.length);
  useEffect(() => {
    const last = log[log.length - 1];
    if (enabled && last && log.length > heard.current) playShot(last.shot.result);
    heard.current = log.length;
  }, [log, enabled]);
}
