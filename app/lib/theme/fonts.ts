export const THEME_FONTS = [
  {
    id: 'system',
    label: 'System UI',
    css: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: 'albertSans',
    label: 'Albert Sans',
    css: '"Albert Sans", sans-serif',
    google: 'Albert Sans:wght@400;500;600;700',
  },
  { id: 'inter', label: 'Inter', css: '"Inter", sans-serif', google: 'Inter:wght@400;500;600;700' },
  {
    id: 'plusJakartaSans',
    label: 'Plus Jakarta Sans',
    css: '"Plus Jakarta Sans", sans-serif',
    google: 'Plus Jakarta Sans:wght@400;500;600;700',
  },
  { id: 'dmSans', label: 'DM Sans', css: '"DM Sans", sans-serif', google: 'DM Sans:wght@400;500;600;700' },
  {
    id: 'spaceGrotesk',
    label: 'Space Grotesk',
    css: '"Space Grotesk", sans-serif',
    google: 'Space Grotesk:wght@400;500;600;700',
  },
  { id: 'outfit', label: 'Outfit', css: '"Outfit", sans-serif', google: 'Outfit:wght@400;500;600;700' },
  { id: 'geist', label: 'Geist', css: '"Geist", sans-serif', google: 'Geist:wght@400;500;600;700' },
  {
    id: 'instrumentSerif',
    label: 'Instrument Serif',
    css: '"Instrument Serif", Georgia, serif',
    google: 'Instrument Serif:wght@400',
  },
  {
    id: 'playfairDisplay',
    label: 'Playfair Display',
    css: '"Playfair Display", Georgia, serif',
    google: 'Playfair Display:wght@400;500;600;700',
  },
  {
    id: 'jetBrainsMono',
    label: 'JetBrains Mono',
    css: '"JetBrains Mono", ui-monospace, monospace',
    google: 'JetBrains Mono:wght@400;500;600;700',
  },
  {
    id: 'firaCode',
    label: 'Fira Code',
    css: '"Fira Code", ui-monospace, monospace',
    google: 'Fira Code:wght@400;500;600;700',
  },
  {
    id: 'ibmPlexMono',
    label: 'IBM Plex Mono',
    css: '"IBM Plex Mono", ui-monospace, monospace',
    google: 'IBM Plex Mono:wght@400;500;600;700',
  },
] as const;

export type ThemeFontId = (typeof THEME_FONTS)[number]['id'];

export interface ThemeFontPreferences {
  heading: ThemeFontId;
  body: ThemeFontId;
  mono: ThemeFontId;
}

export const DEFAULT_THEME_FONTS: ThemeFontPreferences = {
  heading: 'albertSans',
  body: 'inter',
  mono: 'jetBrainsMono',
};

const FONT_BY_ID = new Map(THEME_FONTS.map((font) => [font.id, font]));
const SYSTEM_FONT_CSS = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const FONT_LINK_ID = 'od-dynamic-fonts';

export function isThemeFontId(value: unknown): value is ThemeFontId {
  return typeof value === 'string' && FONT_BY_ID.has(value as ThemeFontId);
}

export function getThemeFontCss(fontId: ThemeFontId): string {
  return FONT_BY_ID.get(fontId)?.css ?? SYSTEM_FONT_CSS;
}

/** Load only the selected, statically allowlisted Google Fonts; CSS stacks keep local fallbacks. */
export function loadThemeFonts(fonts: ThemeFontPreferences): void {
  if (
    typeof document === 'undefined' ||
    !document.head ||
    typeof document.getElementById !== 'function' ||
    typeof document.createElement !== 'function'
  ) {
    return;
  }

  const selectedFamilies = new Map<string, string>();

  for (const fontId of new Set([fonts.heading, fonts.body, fonts.mono])) {
    if (!isThemeFontId(fontId)) {
      continue;
    }

    const font = FONT_BY_ID.get(fontId);

    if (font && 'google' in font) {
      selectedFamilies.set(font.id, font.google);
    }
  }

  const existingLink = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;

  if (selectedFamilies.size === 0) {
    existingLink?.remove();
    return;
  }

  const query = new URLSearchParams();

  for (const family of selectedFamilies.values()) {
    query.append('family', family);
  }

  query.set('display', 'swap');

  const href = `https://fonts.googleapis.com/css2?${query.toString()}`;

  if (existingLink?.href === href) {
    return;
  }

  const link = existingLink ?? document.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = href;

  if (!existingLink) {
    document.head.appendChild(link);
  }
}
