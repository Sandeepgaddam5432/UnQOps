import { describe, expect, it } from 'vitest';
import {
  getContrastRatio,
  hexToRgbChannels,
  passesAA,
  pickReadableForeground,
  rgbChannelsToHex,
  validateThemeConfigJson,
} from '~/lib/theme/contrast';
import { PRESETS } from '~/lib/theme/presets';
import { DEFAULT_THEME_STUDIO_CONFIG, buildPalette } from '~/lib/theme/apply';

describe('theme contrast helpers', () => {
  it('converts hex <-> rgb channels', () => {
    expect(hexToRgbChannels('#202020')).toBe('32 32 32');
    expect(hexToRgbChannels('#fff')).toBe('255 255 255');
    expect(rgbChannelsToHex('32 32 32')).toBe('#202020');
  });

  it('computes WCAG ratios', () => {
    expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(passesAA('#202020', '#ffffff')).toBe(true);
    expect(passesAA('#cccccc', '#ffffff')).toBe(false);
  });

  it('picks a readable foreground', () => {
    expect(pickReadableForeground('#000000')).toBe('#ffffff');
    expect(pickReadableForeground('#ffffff')).toBe('#111111');
  });

  it('keeps every preset text pair AA compliant', () => {
    for (const preset of Object.values(PRESETS)) {
      for (const mode of ['light', 'dark'] as const) {
        const p = preset[mode];
        expect(passesAA(p.fg, p.bg), `${preset.id}/${mode} fg/bg`).toBe(true);
        expect(passesAA(p.primaryFg, p.primary), `${preset.id}/${mode} primary`).toBe(true);
        expect(passesAA(p.accentFg, p.accent), `${preset.id}/${mode} accent`).toBe(true);
      }
    }
  });

  it('derives readable fg for custom brand colors', () => {
    const palette = buildPalette(
      { ...DEFAULT_THEME_STUDIO_CONFIG, customColors: { light: { primary: '#0000ff' } } },
      'light',
    );
    expect(palette.primaryFg).toBe('#ffffff');
  });

  it('validates imported theme json', () => {
    expect(validateThemeConfigJson('nope').ok).toBe(false);
    expect(validateThemeConfigJson('{"foo":1}').ok).toBe(false);

    const res = validateThemeConfigJson(
      '{"presetId":"ocean","radius":"pill","customColors":{"light":{"primary":"#123456","bg":"red"}}}',
    );
    expect(res.ok).toBe(true);

    if (res.ok) {
      expect(res.config.presetId).toBe('ocean');
      expect(res.config.customColors?.light).toEqual({ primary: '#123456' });
    }
  });
});
