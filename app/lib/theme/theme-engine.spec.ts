import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyThemePreferences,
  buildThemePalette,
  contrastRatio,
  DEFAULT_THEME_PREFERENCES,
  ensureContrast,
  readableOn,
  resolveThemeMode,
  sanitizeThemePreferences,
  THEME_PRESET_LIST,
  type ThemePreferences,
} from './theme-engine';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('theme engine', () => {
  it('provides light and dark palettes that meet AA for primary text and controls', () => {
    for (const preset of THEME_PRESET_LIST) {
      for (const mode of ['light', 'dark'] as const) {
        const palette = preset[mode];
        expect(contrastRatio(palette.fg, palette.bg), `${preset.id}/${mode} body text`).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(palette.fgMuted, palette.bg),
          `${preset.id}/${mode} secondary text`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(palette.fgSoft, palette.bg), `${preset.id}/${mode} tertiary text`).toBeGreaterThanOrEqual(
          4.5,
        );
        expect(
          contrastRatio(palette.primaryFg, palette.primary),
          `${preset.id}/${mode} primary control`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(palette.secondaryFg, palette.secondary),
          `${preset.id}/${mode} secondary control`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(palette.accentFg, palette.accent),
          `${preset.id}/${mode} accent control`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('derives a WCAG-readable accent text color for bright brand accents', () => {
    const foreground = ensureContrast('#87ea5c', '#ffffff');
    expect(foreground).not.toBe('#87ea5c');
    expect(contrastRatio(foreground, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(ensureContrast('#ffffff', '#111111')).toBe('#ffffff');
  });

  it('derives a matching foreground for a custom primary color', () => {
    const palette = buildThemePalette('default', 'light', { light: { primary: '#ffff00' } });
    expect(palette.primary).toBe('#ffff00');
    expect(palette.primaryFg).toBe(readableOn('#ffff00'));
    expect(contrastRatio(palette.primaryFg, palette.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('sanitizes malformed preferences and rejects non-hex colors', () => {
    const preferences = sanitizeThemePreferences({
      mode: 'system',
      preset: 'made-up',
      radius: 'sharp',
      fonts: { heading: 'inter;url(javascript:alert(1))', body: 'spaceGrotesk', mono: 42 },
      motion: false,
      colors: {
        light: { primary: '#AbC', bg: 'url(javascript:alert(1))', fg: '#12' },
        dark: 'not-an-object',
      },
    });

    expect(preferences.mode).toBe('system');
    expect(preferences.preset).toBe(DEFAULT_THEME_PREFERENCES.preset);
    expect(preferences.radius).toBe('sharp');
    expect(preferences.fonts).toEqual({
      heading: DEFAULT_THEME_PREFERENCES.fonts.heading,
      body: 'spaceGrotesk',
      mono: DEFAULT_THEME_PREFERENCES.fonts.mono,
    });
    expect(preferences.motion).toBe(false);
    expect(preferences.colors).toEqual({ light: { primary: '#aabbcc' } });
  });

  it('resolves system mode without mutating the saved preference', () => {
    const preferences: ThemePreferences = { ...DEFAULT_THEME_PREFERENCES, mode: 'system' };
    expect(resolveThemeMode(preferences.mode, 'dark')).toBe('dark');
    expect(preferences.mode).toBe('system');
  });

  it('applies palette, radius, density, elevation, and motion tokens to the document root', () => {
    const setProperty = vi.fn();
    const root = { dataset: {} as Record<string, string>, style: { setProperty, colorScheme: '' } };
    vi.stubGlobal('document', { documentElement: root });

    applyThemePreferences(
      {
        ...DEFAULT_THEME_PREFERENCES,
        mode: 'dark',
        radius: 'pill',
        density: 'spacious',
        elevation: 'strong',
        fontScale: 'lg',
        motion: false,
      },
      'dark',
    );

    expect(root.dataset.theme).toBe('dark');
    expect(root.dataset.themeRadius).toBe('pill');
    expect(root.dataset.themeMotion).toBe('off');
    expect(root.style.colorScheme).toBe('dark');
    expect(setProperty).toHaveBeenCalledWith('--theme-radius-control', '999px');
    expect(setProperty).toHaveBeenCalledWith('--theme-density', '1.16');
    expect(setProperty).toHaveBeenCalledWith('--theme-font-scale', '1.08');
    expect(setProperty).toHaveBeenCalledWith('--theme-root-scale', '1.2528');
    expect(setProperty).toHaveBeenCalledWith('--theme-font-heading', expect.stringContaining('sans-serif'));
    expect(setProperty).toHaveBeenCalledWith('--theme-font-body', expect.stringContaining('sans-serif'));
    expect(setProperty).toHaveBeenCalledWith('--theme-font-mono', expect.stringContaining('monospace'));
    expect(setProperty).toHaveBeenCalledWith('--theme-shadow-dialog', expect.any(String));
    expect(setProperty).toHaveBeenCalledWith('--unqops-elements-item-contentAccent', expect.any(String));
  });
});
