import { atom } from 'nanostores';
import { DEFAULT_THEME_FONTS, isThemeFontId, type ThemeFontPreferences } from '~/lib/theme/fonts';
import { logStore } from './logs';
import {
  applyThemePreferences,
  buildThemePalette,
  DEFAULT_THEME_PREFERENCES,
  getSystemTheme,
  isHexColor,
  normalizeHexColor,
  resolveThemeMode,
  sanitizeThemePreferences,
  type ResolvedTheme,
  type ThemeColor,
  type ThemeMode,
  type ThemePreferences,
} from '~/lib/theme/theme-engine';

export type Theme = ResolvedTheme;
export type { ThemeMode, ThemePreferences };

export const kTheme = 'bolt_theme';
export const kThemePreferences = 'bolt_theme_preferences_v1';

function readInitialPreferences(): ThemePreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_THEME_PREFERENCES, colors: {} };
  }

  try {
    const savedPreferences = localStorage.getItem(kThemePreferences);

    if (savedPreferences) {
      return sanitizeThemePreferences(JSON.parse(savedPreferences));
    }

    const legacyTheme = localStorage.getItem(kTheme);

    if (legacyTheme === 'dark' || legacyTheme === 'light') {
      return { ...DEFAULT_THEME_PREFERENCES, mode: legacyTheme, colors: {} };
    }
  } catch {
    // Storage may be disabled or contain malformed data. Use the safe defaults.
  }

  return { ...DEFAULT_THEME_PREFERENCES, colors: {} };
}

const initialPreferences = readInitialPreferences();

export const themePreferencesStore = atom<ThemePreferences>(initialPreferences);
export const themeStore = atom<Theme>(resolveThemeMode(initialPreferences.mode));
export const themeCustomizerOpenStore = atom(false);

export const openThemeCustomizer = () => themeCustomizerOpenStore.set(true);
export const closeThemeCustomizer = () => themeCustomizerOpenStore.set(false);

let themeListenersRegistered = false;

export function themeIsDark() {
  return themeStore.get() === 'dark';
}

export const DEFAULT_THEME: Theme = 'light';

function persistPreferences(preferences: ThemePreferences, resolvedTheme: Theme) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(kThemePreferences, JSON.stringify(preferences));

    // Keep the legacy key in sync for existing integrations and older UI code.
    localStorage.setItem(kTheme, resolvedTheme);
  } catch {
    // Theme changes still apply for this session if browser storage is unavailable.
  }
}

function synchronizeTheme(preferences: ThemePreferences) {
  const resolvedTheme = resolveThemeMode(preferences.mode, getSystemTheme());

  if (themeStore.get() !== resolvedTheme) {
    themeStore.set(resolvedTheme);
  }

  applyThemePreferences(preferences, resolvedTheme);
  persistPreferences(preferences, resolvedTheme);
}

export function initializeTheme(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const preferences = themePreferencesStore.get();
  const resolvedTheme = resolveThemeMode(preferences.mode, getSystemTheme());

  if (themeStore.get() !== resolvedTheme) {
    themeStore.set(resolvedTheme);
  }

  applyThemePreferences(preferences, resolvedTheme);

  if (themeListenersRegistered) {
    return;
  }

  themeListenersRegistered = true;

  if (typeof window.matchMedia === 'function') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const current = themePreferencesStore.get();

      if (current.mode === 'system') {
        synchronizeTheme(current);
      }
    };
    mediaQuery.addEventListener?.('change', handleSystemThemeChange);

    // Support older embedded browsers without changing the app's SSR behavior.
    if (!mediaQuery.addEventListener) {
      mediaQuery.addListener?.(handleSystemThemeChange);
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key === kThemePreferences && event.newValue) {
      try {
        themePreferencesStore.set(sanitizeThemePreferences(JSON.parse(event.newValue)));
      } catch {
        // Ignore malformed values written by other tabs.
      }
    } else if (event.key === kTheme && (event.newValue === 'light' || event.newValue === 'dark')) {
      const current = themePreferencesStore.get();

      if (current.mode !== 'system') {
        themePreferencesStore.set({ ...current, mode: event.newValue });
      }
    }
  });
}

export function updateThemePreferences(patch: Partial<ThemePreferences>): void {
  const current = themePreferencesStore.get();
  const next = sanitizeThemePreferences({
    ...current,
    ...patch,
    fonts: patch.fonts ? { ...current.fonts, ...patch.fonts } : current.fonts,
    colors: patch.colors
      ? Object.keys(patch.colors).length === 0
        ? {}
        : {
            light: { ...current.colors.light, ...patch.colors.light },
            dark: { ...current.colors.dark, ...patch.colors.dark },
          }
      : current.colors,
  });

  themePreferencesStore.set(next);
}

export function setThemeMode(mode: ThemeMode): void {
  updateThemePreferences({ mode });
}

export function setThemeFont(role: keyof ThemeFontPreferences, value: unknown): void {
  if (!isThemeFontId(value)) {
    return;
  }

  const fonts = { ...themePreferencesStore.get().fonts, [role]: value };
  updateThemePreferences({ fonts });
}

export function resetThemePreferences(): void {
  updateThemePreferences({ ...DEFAULT_THEME_PREFERENCES, fonts: { ...DEFAULT_THEME_FONTS }, colors: {} });
}

export function exportThemePreferences(): string {
  return JSON.stringify(themePreferencesStore.get(), null, 2);
}

export function importThemePreferences(value: unknown): void {
  themePreferencesStore.set(sanitizeThemePreferences(value));
}

export function setThemeColor(color: ThemeColor, value: string): void {
  if (!isHexColor(value)) {
    return;
  }

  const preferences = themePreferencesStore.get();
  const resolvedTheme = resolveThemeMode(preferences.mode, getSystemTheme());
  const modes: ResolvedTheme[] = ['primary', 'secondary', 'accent'].includes(color)
    ? ['light', 'dark']
    : [resolvedTheme];
  const colors = {
    light: { ...preferences.colors.light },
    dark: { ...preferences.colors.dark },
  };

  for (const mode of modes) {
    colors[mode][color] = normalizeHexColor(value);

    // Recalculate the matching foreground whenever a background role changes.
    if (color === 'primary') {
      delete colors[mode].primaryFg;
    }

    if (color === 'secondary') {
      delete colors[mode].secondaryFg;
    }

    if (color === 'accent') {
      delete colors[mode].accentFg;
    }
  }

  updateThemePreferences({ colors });
}

export function getCurrentThemePalette(): ReturnType<typeof buildThemePalette> {
  const preferences = themePreferencesStore.get();
  return buildThemePalette(preferences.preset, themeStore.get(), preferences.colors);
}

export function toggleTheme() {
  const newTheme = themeStore.get() === 'dark' ? 'light' : 'dark';
  setThemeMode(newTheme);

  try {
    const userProfile = localStorage.getItem('bolt_user_profile');

    if (userProfile) {
      const profile = JSON.parse(userProfile);
      profile.theme = newTheme;
      localStorage.setItem('bolt_user_profile', JSON.stringify(profile));
    }
  } catch (error) {
    console.error('Error updating user profile theme:', error);
  }

  logStore.logSystem(`Theme changed to ${newTheme} mode`);
}

// Keep the atom and CSS tokens in sync for existing themeStore subscribers.
themePreferencesStore.subscribe((preferences) => synchronizeTheme(preferences));
themeStore.subscribe((theme) => {
  if (typeof document !== 'undefined') {
    applyThemePreferences(themePreferencesStore.get(), theme);
  }

  persistPreferences(themePreferencesStore.get(), theme);
});

initializeTheme();
