// Player preferences, saved separately from campaign progress so "Start over" keeps them.

import { browserStorage } from './save';

export const SETTINGS_KEY = 'brutus:settings';
export const SETTINGS_VERSION = 1;

export interface Settings {
  /** Muted by default. */
  readonly sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: false };

export function loadSettings(storage = browserStorage()): Settings {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const data: unknown = JSON.parse(raw);
    if (
      typeof data === 'object' &&
      data !== null &&
      'version' in data &&
      data.version === SETTINGS_VERSION &&
      'sound' in data &&
      typeof data.sound === 'boolean'
    ) {
      return { sound: data.sound };
    }
  } catch {
    // Fall through to defaults.
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Settings, storage = browserStorage()): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify({ version: SETTINGS_VERSION, ...settings }));
  } catch {
    // Not saved; the choice still applies for this visit.
  }
}
