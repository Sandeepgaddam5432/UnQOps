import {
  DEFAULT_THEME_FONTS,
  getThemeFontCss,
  isThemeFontId,
  loadThemeFonts,
  type ThemeFontPreferences,
} from './fonts';

export type ResolvedTheme = 'light' | 'dark';
export type ThemeMode = ResolvedTheme | 'system';
export type ThemePresetId = 'default' | 'ocean' | 'sunset' | 'forest' | 'monochrome';
export type ThemeDensity = 'compact' | 'comfortable' | 'spacious';
export type ThemeRadius = 'sharp' | 'rounded' | 'pill';
export type ThemeElevation = 'flat' | 'soft' | 'strong';
export type ThemeFontScale = 'sm' | 'md' | 'lg';

export interface ThemePalette {
  bg: string;
  surface: string;
  subtle: string;
  border: string;
  borderStrong: string;
  fg: string;
  fgMuted: string;
  fgSoft: string;
  primary: string;
  primaryFg: string;
  secondary: string;
  secondaryFg: string;
  accent: string;
  accentFg: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export type ThemeColor = keyof ThemePalette;
export type ThemeColorOverrides = { light?: Partial<ThemePalette>; dark?: Partial<ThemePalette> };

export interface ThemePreset {
  id: ThemePresetId;
  label: string;
  description: string;
  light: ThemePalette;
  dark: ThemePalette;
}

export interface ThemePreferences {
  mode: ThemeMode;
  preset: ThemePresetId;
  radius: ThemeRadius;
  density: ThemeDensity;
  elevation: ThemeElevation;
  fontScale: ThemeFontScale;
  fonts: ThemeFontPreferences;
  motion: boolean;
  colors: ThemeColorOverrides;
}

const STATUS_LIGHT = { success: '#00794a', warning: '#a85a00', danger: '#d92d2e', info: '#1a64e0' };
const STATUS_DARK = { success: '#3bbf7d', warning: '#ffc740', danger: '#ff6b6b', info: '#5aaeff' };

const withStatus = (
  palette: Omit<ThemePalette, 'success' | 'warning' | 'danger' | 'info'>,
  dark: boolean,
): ThemePalette => ({
  ...palette,
  ...(dark ? STATUS_DARK : STATUS_LIGHT),
});

export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  default: {
    id: 'default',
    label: 'Default',
    description: 'Neutral surfaces with UnQOps green accents.',
    light: withStatus(
      {
        bg: '#ffffff',
        surface: '#fafafa',
        subtle: '#ededed',
        border: '#dbdbdb',
        borderStrong: '#8a8a8a',
        fg: '#202020',
        fgMuted: '#5c5c5c',
        fgSoft: '#707070',
        primary: '#353535',
        primaryFg: '#fafafa',
        secondary: '#ededed',
        secondaryFg: '#202020',
        accent: '#87ea5c',
        accentFg: '#0d3300',
      },
      false,
    ),
    dark: withStatus(
      {
        bg: '#202020',
        surface: '#2a2a2a',
        subtle: '#353535',
        border: '#494949',
        borderStrong: '#848484',
        fg: '#fafafa',
        fgMuted: '#bdbdbd',
        fgSoft: '#bdbdbd',
        primary: '#ededed',
        primaryFg: '#202020',
        secondary: '#353535',
        secondaryFg: '#fafafa',
        accent: '#87ea5c',
        accentFg: '#0d3300',
      },
      true,
    ),
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    description: 'Cool blues with a bright cyan highlight.',
    light: withStatus(
      {
        bg: '#f7fbfe',
        surface: '#ffffff',
        subtle: '#e6f1f8',
        border: '#cfe0ec',
        borderStrong: '#6a8499',
        fg: '#0b2236',
        fgMuted: '#4a6378',
        fgSoft: '#5f7689',
        primary: '#0b6bcb',
        primaryFg: '#ffffff',
        secondary: '#e0f0fb',
        secondaryFg: '#0b2236',
        accent: '#06b6d4',
        accentFg: '#00252c',
      },
      false,
    ),
    dark: withStatus(
      {
        bg: '#08141f',
        surface: '#0e1f2e',
        subtle: '#153048',
        border: '#1f3f5b',
        borderStrong: '#4f7a9c',
        fg: '#eaf4fb',
        fgMuted: '#9bb7cc',
        fgSoft: '#86a3b8',
        primary: '#4aa3ff',
        primaryFg: '#04121f',
        secondary: '#153048',
        secondaryFg: '#eaf4fb',
        accent: '#22d3ee',
        accentFg: '#00252c',
      },
      true,
    ),
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    description: 'Warm oranges over a soft cream canvas.',
    light: withStatus(
      {
        bg: '#fffaf5',
        surface: '#ffffff',
        subtle: '#fdeee0',
        border: '#f3d9c3',
        borderStrong: '#b08a6e',
        fg: '#2b1408',
        fgMuted: '#6b4a35',
        fgSoft: '#7d5d49',
        primary: '#c2410c',
        primaryFg: '#ffffff',
        secondary: '#ffe8d6',
        secondaryFg: '#2b1408',
        accent: '#f5a524',
        accentFg: '#2b1408',
      },
      false,
    ),
    dark: withStatus(
      {
        bg: '#1a0f0a',
        surface: '#261812',
        subtle: '#35211a',
        border: '#4a2f24',
        borderStrong: '#8a6552',
        fg: '#fff3ea',
        fgMuted: '#d2b3a1',
        fgSoft: '#b99a88',
        primary: '#ff8a4c',
        primaryFg: '#200a00',
        secondary: '#35211a',
        secondaryFg: '#fff3ea',
        accent: '#ffc24b',
        accentFg: '#2b1408',
      },
      true,
    ),
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    description: 'Deep greens balanced with a fresh lime accent.',
    light: withStatus(
      {
        bg: '#f6faf5',
        surface: '#ffffff',
        subtle: '#e4efe2',
        border: '#cddfca',
        borderStrong: '#7a9577',
        fg: '#11261a',
        fgMuted: '#466050',
        fgSoft: '#5c7566',
        primary: '#1f7a3d',
        primaryFg: '#ffffff',
        secondary: '#dff0dc',
        secondaryFg: '#11261a',
        accent: '#b7e34a',
        accentFg: '#1c2b00',
      },
      false,
    ),
    dark: withStatus(
      {
        bg: '#0c1710',
        surface: '#12221a',
        subtle: '#1b3426',
        border: '#284634',
        borderStrong: '#5f8a6e',
        fg: '#eaf6ec',
        fgMuted: '#a4c2ad',
        fgSoft: '#8fae99',
        primary: '#5fd38a',
        primaryFg: '#04170b',
        secondary: '#1b3426',
        secondaryFg: '#eaf6ec',
        accent: '#d4f35c',
        accentFg: '#1c2b00',
      },
      true,
    ),
  },
  monochrome: {
    id: 'monochrome',
    label: 'Monochrome',
    description: 'A quiet palette of black, white and greys.',
    light: withStatus(
      {
        bg: '#ffffff',
        surface: '#f5f5f5',
        subtle: '#e8e8e8',
        border: '#d4d4d4',
        borderStrong: '#8a8a8a',
        fg: '#0a0a0a',
        fgMuted: '#525252',
        fgSoft: '#707070',
        primary: '#0a0a0a',
        primaryFg: '#ffffff',
        secondary: '#e8e8e8',
        secondaryFg: '#0a0a0a',
        accent: '#404040',
        accentFg: '#ffffff',
      },
      false,
    ),
    dark: withStatus(
      {
        bg: '#0a0a0a',
        surface: '#141414',
        subtle: '#1f1f1f',
        border: '#333333',
        borderStrong: '#7a7a7a',
        fg: '#fafafa',
        fgMuted: '#a3a3a3',
        fgSoft: '#8c8c8c',
        primary: '#fafafa',
        primaryFg: '#0a0a0a',
        secondary: '#1f1f1f',
        secondaryFg: '#fafafa',
        accent: '#d4d4d4',
        accentFg: '#0a0a0a',
      },
      true,
    ),
  },
};

export const THEME_PRESET_LIST = Object.values(THEME_PRESETS);

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  mode: 'light',
  preset: 'default',
  radius: 'rounded',
  density: 'comfortable',
  elevation: 'soft',
  fontScale: 'md',
  fonts: { ...DEFAULT_THEME_FONTS },
  motion: true,
  colors: {},
};

const MODE_VALUES: ThemeMode[] = ['light', 'dark', 'system'];
const PRESET_VALUES = Object.keys(THEME_PRESETS) as ThemePresetId[];
const RADIUS_VALUES: ThemeRadius[] = ['sharp', 'rounded', 'pill'];
const DENSITY_VALUES: ThemeDensity[] = ['compact', 'comfortable', 'spacious'];
const ELEVATION_VALUES: ThemeElevation[] = ['flat', 'soft', 'strong'];
const FONT_SCALE_VALUES: ThemeFontScale[] = ['sm', 'md', 'lg'];
const PALETTE_KEYS = Object.keys(THEME_PRESETS.default.light) as ThemeColor[];

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function normalizeHexColor(value: string): string {
  const color = value.toLowerCase();
  return color.length === 4 ? `#${[...color.slice(1)].map((part) => `${part}${part}`).join('')}` : color;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeColorOverrides(value: unknown): ThemeColorOverrides {
  if (!isRecord(value)) {
    return {};
  }

  const result: ThemeColorOverrides = {};

  for (const mode of ['light', 'dark'] as const) {
    const source = value[mode];

    if (!isRecord(source)) {
      continue;
    }

    const colors: Partial<ThemePalette> = {};

    for (const key of PALETTE_KEYS) {
      const color = source[key];

      if (isHexColor(color)) {
        colors[key] = normalizeHexColor(color);
      }
    }

    if (Object.keys(colors).length > 0) {
      result[mode] = colors;
    }
  }

  return result;
}

export function sanitizeThemePreferences(value: unknown): ThemePreferences {
  if (!isRecord(value)) {
    return { ...DEFAULT_THEME_PREFERENCES, fonts: { ...DEFAULT_THEME_FONTS }, colors: {} };
  }

  const rawFonts = isRecord(value.fonts) ? value.fonts : {};
  const preferences: ThemePreferences = {
    mode: MODE_VALUES.includes(value.mode as ThemeMode) ? (value.mode as ThemeMode) : DEFAULT_THEME_PREFERENCES.mode,
    preset: PRESET_VALUES.includes(value.preset as ThemePresetId)
      ? (value.preset as ThemePresetId)
      : DEFAULT_THEME_PREFERENCES.preset,
    radius: RADIUS_VALUES.includes(value.radius as ThemeRadius)
      ? (value.radius as ThemeRadius)
      : DEFAULT_THEME_PREFERENCES.radius,
    density: DENSITY_VALUES.includes(value.density as ThemeDensity)
      ? (value.density as ThemeDensity)
      : DEFAULT_THEME_PREFERENCES.density,
    elevation: ELEVATION_VALUES.includes(value.elevation as ThemeElevation)
      ? (value.elevation as ThemeElevation)
      : DEFAULT_THEME_PREFERENCES.elevation,
    fontScale: FONT_SCALE_VALUES.includes(value.fontScale as ThemeFontScale)
      ? (value.fontScale as ThemeFontScale)
      : DEFAULT_THEME_PREFERENCES.fontScale,
    fonts: {
      heading: isThemeFontId(rawFonts.heading) ? rawFonts.heading : DEFAULT_THEME_FONTS.heading,
      body: isThemeFontId(rawFonts.body) ? rawFonts.body : DEFAULT_THEME_FONTS.body,
      mono: isThemeFontId(rawFonts.mono) ? rawFonts.mono : DEFAULT_THEME_FONTS.mono,
    },
    motion: typeof value.motion === 'boolean' ? value.motion : DEFAULT_THEME_PREFERENCES.motion,
    colors: sanitizeColorOverrides(value.colors),
  };

  return preferences;
}

const HEX_NEAR_BLACK = '#111111';
const HEX_WHITE = '#ffffff';

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.slice(1);
  const full = value.length === 3 ? [...value].map((part) => `${part}${part}`).join('') : value;

  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

export function luminance(hex: string): number {
  const [red, green, blue] = hexToRgb(isHexColor(hex) ? hex : HEX_WHITE).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableOn(background: string): string {
  return contrastRatio(background, HEX_WHITE) >= contrastRatio(background, HEX_NEAR_BLACK) ? HEX_WHITE : HEX_NEAR_BLACK;
}

function mixHexColors(color: string, target: string, amount: number): string {
  const from = hexToRgb(color);
  const to = hexToRgb(target);
  const channels = from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount));

  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** Keep accent/link text legible when a bright brand color is used on a surface. */
export function ensureContrast(foreground: string, background: string, minimum = 4.5): string {
  if (!isHexColor(foreground) || !isHexColor(background) || contrastRatio(foreground, background) >= minimum) {
    return foreground;
  }

  const target = readableOn(background);
  let low = 0;
  let high = 1;

  for (let index = 0; index < 12; index += 1) {
    const amount = (low + high) / 2;
    const candidate = mixHexColors(foreground, target, amount);

    if (contrastRatio(candidate, background) >= minimum) {
      high = amount;
    } else {
      low = amount;
    }
  }

  return mixHexColors(foreground, target, high);
}

export function buildThemePalette(
  preset: ThemePresetId,
  mode: ResolvedTheme,
  colorOverrides: ThemeColorOverrides = {},
): ThemePalette {
  const custom = colorOverrides[mode] ?? {};
  const palette: ThemePalette = { ...THEME_PRESETS[preset][mode], ...custom };

  if (custom.primary && !custom.primaryFg) {
    palette.primaryFg = readableOn(palette.primary);
  }

  if (custom.secondary && !custom.secondaryFg) {
    palette.secondaryFg = readableOn(palette.secondary);
  }

  if (custom.accent && !custom.accentFg) {
    palette.accentFg = readableOn(palette.accent);
  }

  return palette;
}

export function resolveThemeMode(mode: ThemeMode, systemMode: ResolvedTheme = getSystemTheme()): ResolvedTheme {
  return mode === 'system' ? systemMode : mode;
}

export function getSystemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

const RADII: Record<ThemeRadius, { control: string; field: string; card: string; box: string; badge: string }> = {
  sharp: { control: '0px', field: '0px', card: '0px', box: '0px', badge: '0px' },
  rounded: { control: '6px', field: '8px', card: '12px', box: '16px', badge: '999px' },
  pill: { control: '999px', field: '16px', card: '24px', box: '32px', badge: '999px' },
};

const DENSITIES: Record<ThemeDensity, number> = { compact: 0.88, comfortable: 1, spacious: 1.16 };
const FONT_SCALES: Record<ThemeFontScale, number> = { sm: 0.94, md: 1, lg: 1.08 };
const ELEVATION_SHADOWS: Record<
  ThemeElevation,
  Record<ResolvedTheme, { card: string; popover: string; dialog: string }>
> = {
  flat: {
    light: { card: 'none', popover: '0 0 0 1px rgba(0,0,0,.08)', dialog: '0 0 0 1px rgba(0,0,0,.12)' },
    dark: { card: 'none', popover: '0 0 0 1px rgba(255,255,255,.08)', dialog: '0 0 0 1px rgba(255,255,255,.12)' },
  },
  soft: {
    light: {
      card: '0 1px 2px rgba(28,27,26,.06)',
      popover: '0 6px 24px rgba(28,27,26,.1)',
      dialog: '0 24px 60px rgba(28,27,26,.16)',
    },
    dark: {
      card: '0 1px 2px rgba(0,0,0,.3)',
      popover: '0 8px 32px rgba(0,0,0,.36)',
      dialog: '0 24px 60px rgba(0,0,0,.5)',
    },
  },
  strong: {
    light: {
      card: '0 6px 20px rgba(28,27,26,.14)',
      popover: '0 12px 36px rgba(28,27,26,.2)',
      dialog: '0 32px 80px rgba(28,27,26,.25)',
    },
    dark: {
      card: '0 6px 20px rgba(0,0,0,.42)',
      popover: '0 12px 36px rgba(0,0,0,.5)',
      dialog: '0 32px 80px rgba(0,0,0,.62)',
    },
  },
};

export function applyThemePreferences(preferences: ThemePreferences, mode = resolveThemeMode(preferences.mode)): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const palette = buildThemePalette(preferences.preset, mode, preferences.colors);
  loadThemeFonts(preferences.fonts);

  const radius = RADII[preferences.radius];
  const shadows = ELEVATION_SHADOWS[preferences.elevation][mode];
  const colorVariables: Record<ThemeColor, string> = Object.fromEntries(
    Object.entries(palette).map(([key, value]) => [
      `--theme-color-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
      value,
    ]),
  ) as Record<ThemeColor, string>;

  root.dataset.theme = mode;
  root.dataset.themePreset = preferences.preset;
  root.dataset.themeRadius = preferences.radius;
  root.dataset.themeDensity = preferences.density;
  root.dataset.themeElevation = preferences.elevation;
  root.dataset.themeFontHeading = preferences.fonts.heading;
  root.dataset.themeFontBody = preferences.fonts.body;
  root.dataset.themeFontMono = preferences.fonts.mono;
  root.dataset.themeMotion = preferences.motion ? 'on' : 'off';
  root.style.colorScheme = mode;

  for (const [name, value] of Object.entries(colorVariables)) {
    root.style.setProperty(name, value);
  }

  const cssVariables: Record<string, string> = {
    '--theme-font-heading': getThemeFontCss(preferences.fonts.heading),
    '--theme-font-body': getThemeFontCss(preferences.fonts.body),
    '--theme-font-mono': getThemeFontCss(preferences.fonts.mono),
    '--unqops-elements-bg-depth-1': palette.bg,
    '--unqops-elements-bg-depth-2': palette.surface,
    '--unqops-elements-bg-depth-3': palette.subtle,
    '--unqops-elements-bg-depth-4': `color-mix(in srgb, ${palette.fg} 5%, ${palette.surface})`,
    '--unqops-elements-borderColor': palette.border,
    '--unqops-elements-borderColorActive': palette.primary,
    '--unqops-elements-textPrimary': palette.fg,
    '--unqops-elements-textSecondary': palette.fgMuted,
    '--unqops-elements-textTertiary': palette.fgSoft,
    '--unqops-elements-code-background': palette.subtle,
    '--unqops-elements-code-text': palette.fg,
    '--unqops-elements-button-primary-background': palette.primary,
    '--unqops-elements-button-primary-backgroundHover': `color-mix(in srgb, ${palette.primary} 86%, ${palette.fg})`,
    '--unqops-elements-button-primary-text': palette.primaryFg,
    '--unqops-elements-button-secondary-background': palette.secondary,
    '--unqops-elements-button-secondary-backgroundHover': `color-mix(in srgb, ${palette.secondary} 88%, ${palette.fg})`,
    '--unqops-elements-button-secondary-text': palette.secondaryFg,
    '--unqops-elements-button-danger-background': `color-mix(in srgb, ${palette.danger} 12%, transparent)`,
    '--unqops-elements-button-danger-backgroundHover': `color-mix(in srgb, ${palette.danger} 20%, transparent)`,
    '--unqops-elements-button-danger-text': palette.danger,
    '--unqops-elements-item-contentDefault': palette.fgMuted,
    '--unqops-elements-item-contentActive': palette.fg,
    '--unqops-elements-item-contentAccent': ensureContrast(palette.accent, palette.bg),
    '--unqops-elements-item-contentDanger': palette.danger,
    '--unqops-elements-item-backgroundDefault': 'transparent',
    '--unqops-elements-item-backgroundActive': `color-mix(in srgb, ${palette.fg} 8%, transparent)`,
    '--unqops-elements-item-backgroundAccent': `color-mix(in srgb, ${palette.accent} 13%, transparent)`,
    '--unqops-elements-item-backgroundDanger': `color-mix(in srgb, ${palette.danger} 12%, transparent)`,
    '--unqops-elements-loader-background': `color-mix(in srgb, ${palette.fg} 10%, transparent)`,
    '--unqops-elements-loader-progress': palette.primary,
    '--unqops-elements-artifacts-background': palette.surface,
    '--unqops-elements-artifacts-backgroundHover': `color-mix(in srgb, ${palette.fg} 5%, transparent)`,
    '--unqops-elements-artifacts-borderColor': palette.border,
    '--unqops-elements-artifacts-inlineCode-background': palette.subtle,
    '--unqops-elements-artifacts-inlineCode-text': palette.fg,
    '--unqops-elements-actions-background': palette.surface,
    '--unqops-elements-actions-code-background': palette.subtle,
    '--unqops-elements-messages-background': palette.subtle,
    '--unqops-elements-messages-linkColor': ensureContrast(palette.info, palette.bg),
    '--unqops-elements-messages-code-background': palette.surface,
    '--unqops-elements-messages-inlineCode-background': `color-mix(in srgb, ${palette.fg} 8%, transparent)`,
    '--unqops-elements-messages-inlineCode-text': palette.fg,
    '--unqops-elements-icon-success': palette.success,
    '--unqops-elements-icon-error': palette.danger,
    '--unqops-elements-icon-primary': palette.fg,
    '--unqops-elements-icon-secondary': palette.fgMuted,
    '--unqops-elements-icon-tertiary': palette.fgSoft,
    '--unqops-elements-dividerColor': palette.border,
    '--unqops-elements-prompt-background': `color-mix(in srgb, ${palette.surface} 92%, transparent)`,
    '--unqops-elements-sidebar-dropdownShadow': shadows.popover,
    '--unqops-elements-sidebar-buttonBackgroundDefault': `color-mix(in srgb, ${palette.primary} 10%, transparent)`,
    '--unqops-elements-sidebar-buttonBackgroundHover': `color-mix(in srgb, ${palette.primary} 18%, transparent)`,
    '--unqops-elements-sidebar-buttonText': ensureContrast(palette.primary, palette.surface),
    '--unqops-elements-preview-addressBar-background': palette.subtle,
    '--unqops-elements-preview-addressBar-backgroundHover': `color-mix(in srgb, ${palette.fg} 6%, transparent)`,
    '--unqops-elements-preview-addressBar-backgroundActive': palette.surface,
    '--unqops-elements-preview-addressBar-text': palette.fgMuted,
    '--unqops-elements-preview-addressBar-textActive': palette.fg,
    '--unqops-elements-terminals-background': palette.bg,
    '--unqops-elements-terminals-buttonBackground': palette.subtle,
    '--unqops-elements-cta-background': palette.secondary,
    '--unqops-elements-cta-text': palette.secondaryFg,
    '--unqops-elements-link': palette.info,
    '--unqops-elements-focus': `color-mix(in srgb, ${palette.primary} 50%, transparent)`,
    '--unqops-terminal-background': palette.bg,
    '--unqops-terminal-foreground': palette.fg,
    '--unqops-terminal-selection-background': `color-mix(in srgb, ${palette.primary} 28%, transparent)`,
    '--modern-scrollbar-thumb-background': `color-mix(in srgb, ${palette.fgMuted} 38%, transparent)`,
    '--modern-scrollbar-thumb-backgroundHover': `color-mix(in srgb, ${palette.fgMuted} 72%, transparent)`,
    '--theme-radius-control': radius.control,
    '--theme-radius-field': radius.field,
    '--theme-radius-card': radius.card,
    '--theme-radius-box': radius.box,
    '--theme-radius-badge': radius.badge,
    '--theme-density': String(DENSITIES[preferences.density]),
    '--theme-font-scale': String(FONT_SCALES[preferences.fontScale]),
    '--theme-root-scale': String(DENSITIES[preferences.density] * FONT_SCALES[preferences.fontScale]),
    '--theme-shadow-card': shadows.card,
    '--theme-shadow-popover': shadows.popover,
    '--theme-shadow-dialog': shadows.dialog,
    '--theme-motion-duration': preferences.motion ? '180ms' : '0ms',
    '--theme-primary': palette.primary,
    '--theme-accent': palette.accent,
  };

  for (const [name, value] of Object.entries(cssVariables)) {
    root.style.setProperty(name, value);
  }
}
