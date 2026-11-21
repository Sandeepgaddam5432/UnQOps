export const PRESET_IDS = ['default', 'ocean', 'sunset', 'forest', 'monochrome'] as const;
export type PresetId = (typeof PRESET_IDS)[number];
export const PRESET_STORAGE_KEY = 'unqops_theme_preset';

export function resolvePreset(value: string | null): PresetId {
  return PRESET_IDS.find((preset) => preset === value) ?? 'default';
}
