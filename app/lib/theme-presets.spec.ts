import { describe, expect, it } from 'vitest';
import { PRESET_IDS, resolvePreset } from './theme-presets';

describe('workspace palette selection', () => {
  it('accepts the five supported palettes', () => {
    for (const preset of PRESET_IDS) {
      expect(resolvePreset(preset)).toBe(preset);
    }
  });

  it('falls back to default for invalid or missing values', () => {
    expect(resolvePreset(null)).toBe('default');
    expect(resolvePreset('invalid')).toBe('default');
  });
});
