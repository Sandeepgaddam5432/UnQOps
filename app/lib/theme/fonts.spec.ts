import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_THEME_FONTS,
  getThemeFontCss,
  isThemeFontId,
  loadThemeFonts,
  THEME_FONTS,
  type ThemeFontId,
} from './fonts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('theme font registry', () => {
  it('uses a finite allowlist and provides safe CSS stacks', () => {
    for (const font of THEME_FONTS) {
      expect(isThemeFontId(font.id)).toBe(true);
      expect(getThemeFontCss(font.id)).toBe(font.css);
    }

    for (const fontId of Object.values(DEFAULT_THEME_FONTS)) {
      expect(isThemeFontId(fontId)).toBe(true);
    }

    expect(isThemeFontId('https://fonts.example.invalid/family')).toBe(false);
    expect(isThemeFontId('inter;url(javascript:alert(1))')).toBe(false);
    expect(getThemeFontCss('system')).toContain('system-ui');
  });

  it('loads only the unique selected font families from the fixed Google Fonts origin', () => {
    const link = { id: '', rel: '', href: '' } as HTMLLinkElement;
    const appendChild = vi.fn();
    const documentStub = {
      head: { appendChild },
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => link),
    };
    vi.stubGlobal('document', documentStub);

    loadThemeFonts({ heading: 'inter', body: 'inter', mono: 'jetBrainsMono' });

    expect(documentStub.createElement).toHaveBeenCalledWith('link');
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(link.id).toBe('od-dynamic-fonts');
    expect(link.rel).toBe('stylesheet');

    const url = new URL(link.href);
    expect(url.origin).toBe('https://fonts.googleapis.com');
    expect(url.pathname).toBe('/css2');
    expect(url.searchParams.getAll('family')).toEqual([
      'Inter:wght@400;500;600;700',
      'JetBrains Mono:wght@400;500;600;700',
    ]);
    expect(url.searchParams.get('display')).toBe('swap');
  });

  it('does not request remote assets for system fonts or unrecognized runtime values', () => {
    const remove = vi.fn();
    const existingLink = { remove } as unknown as HTMLLinkElement;
    const getElementById = vi.fn<(id: string) => HTMLLinkElement | null>(() => existingLink);
    const documentStub = {
      head: { appendChild: vi.fn() },
      getElementById,
      createElement: vi.fn(),
    };
    vi.stubGlobal('document', documentStub);

    loadThemeFonts({ heading: 'system', body: 'system', mono: 'system' });
    expect(remove).toHaveBeenCalledOnce();
    expect(documentStub.createElement).not.toHaveBeenCalled();

    documentStub.getElementById.mockReturnValue(null);
    loadThemeFonts({
      heading: 'system',
      body: 'https://attacker.invalid/font' as ThemeFontId,
      mono: 'system',
    });
    expect(documentStub.createElement).not.toHaveBeenCalled();
  });
});
