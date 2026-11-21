import type { ThemePaletteHex, ThemeStudioConfig } from '~/lib/theme/types';

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value.trim());
}

export function normalizeHex(hex: string): string {
  const h = hex.trim().replace('#', '').toLowerCase();
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;

  return `#${full}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(normalizeHex(hex).slice(1), 16);

  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `#202020` -> `32 32 32` (space separated channels usable as `rgb(var(--od-bg) / 0.5)`). */
export function hexToRgbChannels(hex: string): string {
  return hexToRgb(hex).join(' ');
}

export function rgbChannelsToHex(channels: string): string {
  const parts = channels
    .trim()
    .split(/[\s,]+/)
    .map((p) => Math.max(0, Math.min(255, parseInt(p, 10) || 0)));

  return `#${parts.map((p) => p.toString(16).padStart(2, '0')).join('')}`;
}

export function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;

    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as [number, number, number];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1 - 21). */
export function getContrastRatio(a: string, b: string): number {
  const [hi, lo] = [getLuminance(a), getLuminance(b)].sort((x, y) => y - x) as [number, number];

  return (hi + 0.05) / (lo + 0.05);
}

export function passesAA(fg: string, bg: string, largeText = false): boolean {
  return getContrastRatio(fg, bg) >= (largeText ? 3 : 4.5);
}

/** Picks near-black or white text, whichever has more contrast on `bg`. */
export function pickReadableForeground(bg: string): string {
  return getContrastRatio(bg, '#ffffff') >= getContrastRatio(bg, '#111111') ? '#ffffff' : '#111111';
}

const PRESET_IDS = ['default', 'ocean', 'sunset', 'forest', 'monochrome', 'custom'];
const MODES = ['light', 'dark', 'system'];
const SCALES = ['sm', 'md', 'lg'];
const RADII = ['sharp', 'rounded', 'pill'];
const DENSITIES = ['compact', 'comfortable', 'spacious'];
const ELEVATIONS = ['flat', 'soft', 'strong'];
const SURFACES = ['solid', 'glass', 'bordered'];
const SPEEDS = ['slow', 'normal', 'fast'];
const PALETTE_KEYS: Array<keyof ThemePaletteHex> = [
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

export type ValidationResult = { ok: true; config: Partial<ThemeStudioConfig> } | { ok: false; error: string };

function pickEnum<T extends string>(value: unknown, allowed: string[]): T | undefined {
  return typeof value === 'string' && allowed.includes(value) ? (value as T) : undefined;
}

function sanitizeColors(input: unknown): Partial<ThemePaletteHex> | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const out: Partial<ThemePaletteHex> = {};

  for (const key of PALETTE_KEYS) {
    const v = (input as Record<string, unknown>)[key];

    if (isValidHex(v)) {
      out[key] = normalizeHex(v);
    }
  }

  return Object.keys(out).length ? out : undefined;
}

/** Validates + sanitizes an imported theme JSON string. Unknown keys are dropped. */
export function validateThemeConfigJson(json: string): ValidationResult {
  let raw: unknown;

  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Invalid JSON: could not parse theme file.' };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Theme JSON must be an object.' };
  }

  const r = raw as Record<string, any>;
  const config: Partial<ThemeStudioConfig> = {};

  const presetId = pickEnum<ThemeStudioConfig['presetId']>(r.presetId, PRESET_IDS);
  const mode = pickEnum<ThemeStudioConfig['mode']>(r.mode, MODES);
  const fontScale = pickEnum<ThemeStudioConfig['fontScale']>(r.fontScale, SCALES);
  const radius = pickEnum<ThemeStudioConfig['radius']>(r.radius, RADII);
  const density = pickEnum<ThemeStudioConfig['density']>(r.density, DENSITIES);
  const elevation = pickEnum<ThemeStudioConfig['elevation']>(r.elevation, ELEVATIONS);
  const surfaceStyle = pickEnum<ThemeStudioConfig['surfaceStyle']>(r.surfaceStyle, SURFACES);

  if (presetId) {
    config.presetId = presetId;
  }

  if (mode) {
    config.mode = mode;
  }

  if (fontScale) {
    config.fontScale = fontScale;
  }

  if (radius) {
    config.radius = radius;
  }

  if (density) {
    config.density = density;
  }

  if (elevation) {
    config.elevation = elevation;
  }

  if (surfaceStyle) {
    config.surfaceStyle = surfaceStyle;
  }

  if (r.customColors && typeof r.customColors === 'object') {
    const light = sanitizeColors(r.customColors.light);
    const dark = sanitizeColors(r.customColors.dark);
    config.customColors = { ...(light ? { light } : {}), ...(dark ? { dark } : {}) };
  }

  if (r.fonts && typeof r.fonts === 'object') {
    const { heading, body, mono } = r.fonts as Record<string, unknown>;

    if (typeof heading === 'string' && typeof body === 'string' && typeof mono === 'string') {
      config.fonts = { heading, body, mono };
    }
  }

  if (r.motion && typeof r.motion === 'object') {
    const speed = pickEnum<ThemeStudioConfig['motion']['speed']>(r.motion.speed, SPEEDS) ?? 'normal';
    config.motion = { enabled: r.motion.enabled !== false, speed };
  }

  if (Object.keys(config).length === 0) {
    return { ok: false, error: 'No recognised theme settings found in this JSON.' };
  }

  return { ok: true, config };
}
