import { hexToRgbChannels, pickReadableForeground } from '~/lib/theme/contrast';
import { getFont, loadDynamicFonts } from '~/lib/theme/fonts';
import { getPresetPalette } from '~/lib/theme/presets';
import type {
  Density,
  Elevation,
  FontScale,
  MotionSpeed,
  PaletteKey,
  RadiusStyle,
  ResolvedMode,
  ThemeMode,
  ThemePaletteHex,
  ThemeStudioConfig,
} from '~/lib/theme/types';

export const THEME_STUDIO_STORAGE_KEY = 'unqops_theme_studio';
export const LEGACY_THEME_STORAGE_KEY = 'bolt_theme';

export const DEFAULT_THEME_STUDIO_CONFIG: ThemeStudioConfig = {
  presetId: 'default',
  mode: 'system',
  customColors: {},
  fonts: { heading: 'albert-sans', body: 'albert-sans', mono: 'jetbrains-mono' },
  fontScale: 'md',
  radius: 'rounded',
  density: 'comfortable',
  elevation: 'soft',
  surfaceStyle: 'solid',
  motion: { enabled: true, speed: 'normal' },
};

const RADIUS: Record<RadiusStyle, Record<string, string>> = {
  sharp: { control: '0px', field: '0px', card: '0px', box: '0px', badge: '0px' },
  rounded: { control: '8px', field: '8px', card: '12px', box: '16px', badge: '999px' },
  pill: { control: '999px', field: '16px', card: '28px', box: '32px', badge: '999px' },
};

const DENSITY: Record<Density, number> = { compact: 0.85, comfortable: 1, spacious: 1.2 };
const FONT_SCALE: Record<FontScale, number> = { sm: 0.9375, md: 1, lg: 1.0625 };
const MOTION: Record<MotionSpeed, number> = { slow: 1.8, normal: 1, fast: 0.55 };

const ELEVATION: Record<Elevation, Record<ResolvedMode, [string, string, string]>> = {
  flat: {
    light: ['none', 'none', '0 0 0 1px rgba(0,0,0,0.04)'],
    dark: ['none', 'none', '0 0 0 1px rgba(255,255,255,0.06)'],
  },
  soft: {
    light: [
      '0 1px 2px rgba(28,27,26,0.06)',
      '0 6px 24px rgba(28,27,26,0.08), 0 2px 6px rgba(28,27,26,0.04)',
      '0 24px 60px rgba(28,27,26,0.16), 0 8px 16px rgba(28,27,26,0.07)',
    ],
    dark: [
      '0 1px 2px rgba(0,0,0,0.3)',
      '0 6px 24px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.25)',
      '0 24px 60px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.3)',
    ],
  },
  strong: {
    light: [
      '0 2px 4px rgba(0,0,0,0.12)',
      '0 12px 32px rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.1)',
      '0 32px 80px rgba(0,0,0,0.28), 0 12px 24px rgba(0,0,0,0.14)',
    ],
    dark: [
      '0 2px 4px rgba(0,0,0,0.5)',
      '0 12px 32px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.4)',
      '0 32px 80px rgba(0,0,0,0.75), 0 12px 24px rgba(0,0,0,0.5)',
    ],
  },
};

const PALETTE_KEYS: PaletteKey[] = [
  'bg',
  'surface',
  'subtle',
  'border',
  'borderStrong',
  'fg',
  'fgMuted',
  'fgSoft',
  'primary',
  'primaryFg',
  'secondary',
  'secondaryFg',
  'accent',
  'accentFg',
  'success',
  'warning',
  'danger',
  'info',
];

const FG_PAIRS: Array<[PaletteKey, PaletteKey]> = [
  ['primary', 'primaryFg'],
  ['secondary', 'secondaryFg'],
  ['accent', 'accentFg'],
];

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function getSystemMode(): ResolvedMode {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

export function resolveMode(mode: ThemeMode): ResolvedMode {
  return mode === 'system' ? getSystemMode() : mode;
}

/** Preset palette + user overrides. `-fg` colors are auto-derived when only the base color is overridden. */
export function buildPalette(config: ThemeStudioConfig, mode: ResolvedMode): ThemePaletteHex {
  const override = config.customColors?.[mode] ?? {};
  const palette: ThemePaletteHex = { ...getPresetPalette(config.presetId, mode), ...override };

  for (const [base, fg] of FG_PAIRS) {
    if (override[base] && !override[fg]) {
      palette[fg] = pickReadableForeground(palette[base]);
    }
  }

  return palette;
}

/** Writes every `--od-*` design token and `data-*` attribute to `<html>`. Idempotent. */
export function applyThemeStudio(config: ThemeStudioConfig, mode: ResolvedMode = resolveMode(config.mode)): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  const palette = buildPalette(config, mode);

  for (const key of PALETTE_KEYS) {
    set(`--od-${kebab(key)}`, hexToRgbChannels(palette[key]));
  }

  for (const [k, v] of Object.entries(RADIUS[config.radius])) {
    set(`--od-r-${k}`, v);
  }

  const [sm, md, lg] = ELEVATION[config.elevation][mode];
  set('--od-shadow-sm', sm);
  set('--od-shadow-md', md);
  set('--od-shadow-lg', lg);

  set('--od-density', String(DENSITY[config.density]));
  set('--od-font-scale', String(FONT_SCALE[config.fontScale]));
  set('--od-motion-scale', config.motion.enabled ? String(MOTION[config.motion.speed]) : '0');

  set('--od-font-heading', getFont(config.fonts.heading).stack);
  set('--od-font-body', getFont(config.fonts.body).stack);
  set('--od-font-mono', getFont(config.fonts.mono).stack);
  loadDynamicFonts([config.fonts.heading, config.fonts.body, config.fonts.mono]);

  root.setAttribute('data-theme', mode);
  root.setAttribute('data-preset', config.presetId);
  root.setAttribute('data-radius', config.radius);
  root.setAttribute('data-density', config.density);
  root.setAttribute('data-elevation', config.elevation);
  root.setAttribute('data-surface-style', config.surfaceStyle);
  root.setAttribute('data-motion', config.motion.enabled ? 'on' : 'off');
  root.style.colorScheme = mode;

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.bg);
}

/** Persists the studio config and mirrors the resolved light/dark value into the legacy `bolt_theme` key. */
export function persistThemeStudio(config: ThemeStudioConfig, resolved: ResolvedMode): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(THEME_STUDIO_STORAGE_KEY, JSON.stringify(config));
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, resolved);
  } catch {
    // storage may be unavailable (private mode / quota) - theme still applies for this session
  }
}

/** Merges unknown stored data on top of defaults so older/partial configs never crash the app. */
export function mergeWithDefaults(partial: Partial<ThemeStudioConfig> | null | undefined): ThemeStudioConfig {
  const d = DEFAULT_THEME_STUDIO_CONFIG;

  return {
    ...d,
    ...(partial ?? {}),
    customColors: { ...(partial?.customColors ?? {}) },
    fonts: { ...d.fonts, ...(partial?.fonts ?? {}) },
    motion: { ...d.motion, ...(partial?.motion ?? {}) },
  };
}
