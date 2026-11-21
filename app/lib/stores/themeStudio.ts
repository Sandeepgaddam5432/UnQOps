import { atom } from 'nanostores';
import {
  DEFAULT_THEME_STUDIO_CONFIG,
  THEME_STUDIO_STORAGE_KEY,
  applyThemeStudio,
  mergeWithDefaults,
  persistThemeStudio,
  resolveMode,
} from '~/lib/theme/apply';
import { validateThemeConfigJson } from '~/lib/theme/contrast';
import type { PaletteKey, ResolvedMode, ThemeMode, ThemePaletteHex, ThemeStudioConfig } from '~/lib/theme/types';
import { themeStore } from '~/lib/stores/theme';
import type { Theme } from '~/lib/stores/theme';

function readStoredConfig(): ThemeStudioConfig {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_THEME_STUDIO_CONFIG;
  }

  try {
    const raw = localStorage.getItem(THEME_STUDIO_STORAGE_KEY);

    if (raw) {
      return mergeWithDefaults(JSON.parse(raw) as Partial<ThemeStudioConfig>);
    }

    // First run: honour a pre-existing legacy `bolt_theme` choice.
    const legacy = localStorage.getItem('bolt_theme');

    if (legacy === 'light' || legacy === 'dark') {
      return { ...DEFAULT_THEME_STUDIO_CONFIG, mode: legacy };
    }
  } catch {
    // ignore corrupted storage and fall back to defaults
  }

  return DEFAULT_THEME_STUDIO_CONFIG;
}

export const themeStudioStore = atom<ThemeStudioConfig>(
  import.meta.env.SSR ? DEFAULT_THEME_STUDIO_CONFIG : readStoredConfig(),
);
export const resolvedModeStore = atom<ResolvedMode>(
  import.meta.env.SSR ? 'light' : resolveMode(themeStudioStore.get().mode),
);
export const themeCustomizerOpenStore = atom<boolean>(false);

/** Applies + persists the current config and syncs the legacy `themeStore`. */
function commit(config: ThemeStudioConfig) {
  const resolved = resolveMode(config.mode);
  applyThemeStudio(config, resolved);
  persistThemeStudio(config, resolved);
  resolvedModeStore.set(resolved);

  if (themeStore.get() !== resolved) {
    themeStore.set(resolved as Theme);
  }
}

export function updateThemeStudio(partial: Partial<ThemeStudioConfig>) {
  const next = mergeWithDefaults({ ...themeStudioStore.get(), ...partial });
  themeStudioStore.set(next);
  commit(next);
}

export function setThemeMode(mode: ThemeMode) {
  updateThemeStudio({ mode });
}

export function setPreset(presetId: ThemeStudioConfig['presetId']) {
  // Picking a built-in preset clears manual overrides so the preset shows exactly as designed.
  updateThemeStudio({ presetId, customColors: presetId === 'custom' ? themeStudioStore.get().customColors : {} });
}

export function setCustomColor(mode: ResolvedMode, key: PaletteKey, hex: string) {
  const current = themeStudioStore.get();
  const bucket: Partial<ThemePaletteHex> = { ...(current.customColors[mode] ?? {}), [key]: hex };
  updateThemeStudio({
    presetId: current.presetId,
    customColors: { ...current.customColors, [mode]: bucket },
  });
}

export function resetCustomColors() {
  updateThemeStudio({ customColors: {} });
}

export function resetThemeStudio() {
  updateThemeStudio({ ...DEFAULT_THEME_STUDIO_CONFIG, mode: themeStudioStore.get().mode });
}

export function exportThemeJson(): string {
  return JSON.stringify(themeStudioStore.get(), null, 2);
}

export function importThemeJson(json: string): { ok: true } | { ok: false; error: string } {
  const result = validateThemeConfigJson(json);

  if (!result.ok) {
    return result;
  }

  updateThemeStudio(result.config);

  return { ok: true };
}

/** Client-only bootstrap: applies stored config, wires OS-theme + legacy-theme-store sync. Returns cleanup. */
export function initThemeStudio(): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const config = themeStudioStore.get();
  commit(config);

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (themeStudioStore.get().mode === 'system') {
      commit(themeStudioStore.get());
    }
  };
  media.addEventListener('change', onSystemChange);

  // Legacy `toggleTheme()` / ThemeSwitch updates `themeStore` -> reflect as an explicit mode.
  const unsubscribe = themeStore.listen((value) => {
    if (value !== resolvedModeStore.get()) {
      updateThemeStudio({ mode: value });
    }
  });

  return () => {
    media.removeEventListener('change', onSystemChange);
    unsubscribe();
  };
}
