import { describe, expect, it } from 'vitest';
import type { SaveStorage } from './save';
import { DEFAULT_SETTINGS, SETTINGS_KEY, loadSettings, saveSettings } from './settings';

const memory = (): SaveStorage & { items: Map<string, string> } => {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => {
      items.set(k, v);
    },
    removeItem: (k) => {
      items.delete(k);
    },
  };
};

describe('settings', () => {
  it('defaults to sound off', () => {
    expect(DEFAULT_SETTINGS.sound).toBe(false);
    expect(loadSettings(memory())).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips', () => {
    const storage = memory();
    saveSettings({ sound: true }, storage);
    expect(loadSettings(storage)).toEqual({ sound: true });
  });

  it.each([
    ['not JSON', '{'],
    ['another version', JSON.stringify({ version: 2, sound: true })],
    ['a wrong type', JSON.stringify({ version: 1, sound: 'yes' })],
  ])('falls back to defaults for %s', (_, raw) => {
    const storage = memory();
    storage.setItem(SETTINGS_KEY, raw);
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });
});
