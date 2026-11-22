import { afterEach, describe, expect, it } from 'vitest';
import {
  exportThemePreferences,
  importThemePreferences,
  openThemeCustomizer,
  closeThemeCustomizer,
  resetThemePreferences,
  setThemeFont,
  themeCustomizerOpenStore,
  themePreferencesStore,
} from './theme';

afterEach(() => {
  resetThemePreferences();
  themeCustomizerOpenStore.set(false);
});

describe('theme preferences store', () => {
  it('applies typography choices live without replacing the other font roles', () => {
    setThemeFont('heading', 'spaceGrotesk');
    setThemeFont('body', 'dmSans');

    expect(themePreferencesStore.get().fonts).toEqual({
      heading: 'spaceGrotesk',
      body: 'dmSans',
      mono: 'jetBrainsMono',
    });
  });

  it('rejects font names outside the finite registry', () => {
    const before = themePreferencesStore.get().fonts;

    setThemeFont('body', 'https://attacker.invalid/font');

    expect(themePreferencesStore.get().fonts).toEqual(before);
  });

  it('imports and exports only sanitized theme preferences', () => {
    const imported = JSON.parse(
      '{"mode":"dark","fonts":{"heading":"playfairDisplay","body":"url(javascript:alert(1))","mono":"system"},"colors":{"light":{"primary":"#AbC","bg":"url(javascript:alert(1))","__proto__":{"polluted":true}}},"__proto__":{"polluted":true}}',
    );

    importThemePreferences(imported);

    expect(themePreferencesStore.get().mode).toBe('dark');
    expect(themePreferencesStore.get().fonts).toEqual({
      heading: 'playfairDisplay',
      body: 'inter',
      mono: 'system',
    });
    expect(themePreferencesStore.get().colors).toEqual({ light: { primary: '#aabbcc' } });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();

    const exported = JSON.parse(exportThemePreferences());
    expect(exported).toEqual(themePreferencesStore.get());
    expect(Object.keys(exported)).not.toContain('__proto__');
  });

  it('opens and closes the shared Theme Studio drawer state', () => {
    openThemeCustomizer();
    expect(themeCustomizerOpenStore.get()).toBe(true);

    closeThemeCustomizer();
    expect(themeCustomizerOpenStore.get()).toBe(false);
  });

  it('restores font defaults when resetting appearance', () => {
    setThemeFont('heading', 'playfairDisplay');

    resetThemePreferences();

    expect(themePreferencesStore.get().fonts).toEqual({
      heading: 'albertSans',
      body: 'inter',
      mono: 'jetBrainsMono',
    });
  });
});
