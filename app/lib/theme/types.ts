export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedMode = 'light' | 'dark';
export type PresetId = 'default' | 'ocean' | 'sunset' | 'forest' | 'monochrome' | 'custom';
export type BuiltInPresetId = Exclude<PresetId, 'custom'>;
export type FontScale = 'sm' | 'md' | 'lg';
export type RadiusStyle = 'sharp' | 'rounded' | 'pill';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type Elevation = 'flat' | 'soft' | 'strong';
export type SurfaceStyle = 'solid' | 'glass' | 'bordered';
export type MotionSpeed = 'slow' | 'normal' | 'fast';

/** Every semantic color the UI can use, as `#rrggbb` hex strings. */
export interface ThemePaletteHex {
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

export type PaletteKey = keyof ThemePaletteHex;

export interface ThemePreset {
  id: BuiltInPresetId;
  label: string;
  description: string;
  light: ThemePaletteHex;
  dark: ThemePaletteHex;
}

export interface FontOption {
  id: string;
  label: string;
  kind: 'sans' | 'serif' | 'mono';

  /** Full CSS font-family stack including fallbacks. */
  stack: string;

  /** Google Fonts `family=` query value. Omitted for system fonts. */
  google?: string;
}

export interface ThemeStudioConfig {
  presetId: PresetId;
  mode: ThemeMode;
  customColors: { light?: Partial<ThemePaletteHex>; dark?: Partial<ThemePaletteHex> };
  fonts: { heading: string; body: string; mono: string };
  fontScale: FontScale;
  radius: RadiusStyle;
  density: Density;
  elevation: Elevation;
  surfaceStyle: SurfaceStyle;
  motion: { enabled: boolean; speed: MotionSpeed };
}
