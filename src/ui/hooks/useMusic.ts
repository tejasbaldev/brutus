import { useContext, useEffect } from 'react';
import type { CampaignState } from '../../engine/campaign';
import { createMusic, type Mood } from '../music';
import { SoundContext } from './useSound';

let music: ReturnType<typeof createMusic> | undefined;

/** Which score plays for a point in the campaign (title screen when null). */
export function moodFor(campaign: CampaignState | null): Mood {
  if (!campaign) return 'title';
  switch (campaign.stage) {
    case 'coop':
      return 'coop';
    case 'ending':
      return 'ending';
    case 'choice':
    case 'fight':
    case 'escalation':
      return 'ch4';
    default:
      return `ch${campaign.chapter}`;
  }
}

/** Keeps the ambient score running while sound is on, following the mood. */
export function useMusic(mood: Mood, seed: number): void {
  const enabled = useContext(SoundContext);
  useEffect(() => {
    if (!enabled) return;
    music ??= createMusic();
    music.start(seed);
    return () => {
      music?.stop();
    };
  }, [enabled, seed]);
  useEffect(() => {
    if (enabled) music?.setMood(mood);
  }, [enabled, mood]);
}
