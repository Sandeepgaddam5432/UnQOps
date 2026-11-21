import type { FontOption } from '~/lib/theme/types';

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'ui-serif, Georgia, Cambria, "Times New Roman", serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export const FONT_LIBRARY: FontOption[] = [
  { id: 'system-ui', label: 'System UI', kind: 'sans', stack: SANS },
  {
    id: 'albert-sans',
    label: 'Albert Sans',
    kind: 'sans',
    stack: `"Albert Sans", ${SANS}`,
    google: 'Albert+Sans:wght@400;500;600;700',
  },
  { id: 'inter', label: 'Inter', kind: 'sans', stack: `"Inter", ${SANS}`, google: 'Inter:wght@400;500;600;700' },
  {
    id: 'plus-jakarta-sans',
    label: 'Plus Jakarta Sans',
    kind: 'sans',
    stack: `"Plus Jakarta Sans", ${SANS}`,
    google: 'Plus+Jakarta+Sans:wght@400;500;600;700',
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    kind: 'sans',
    stack: `"DM Sans", ${SANS}`,
    google: 'DM+Sans:wght@400;500;600;700',
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    kind: 'sans',
    stack: `"Space Grotesk", ${SANS}`,
    google: 'Space+Grotesk:wght@400;500;600;700',
  },
  { id: 'outfit', label: 'Outfit', kind: 'sans', stack: `"Outfit", ${SANS}`, google: 'Outfit:wght@400;500;600;700' },
  { id: 'geist', label: 'Geist', kind: 'sans', stack: `"Geist", ${SANS}`, google: 'Geist:wght@400;500;600;700' },
  {
    id: 'instrument-serif',
    label: 'Instrument Serif',
    kind: 'serif',
    stack: `"Instrument Serif", ${SERIF}`,
    google: 'Instrument+Serif',
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    kind: 'serif',
    stack: `"Playfair Display", ${SERIF}`,
    google: 'Playfair+Display:wght@500;600;700',
  },
  { id: 'system-mono', label: 'System Mono', kind: 'mono', stack: MONO },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    kind: 'mono',
    stack: `"JetBrains Mono", ${MONO}`,
    google: 'JetBrains+Mono:wght@400;500;700',
  },
  {
    id: 'fira-code',
    label: 'Fira Code',
    kind: 'mono',
    stack: `"Fira Code", ${MONO}`,
    google: 'Fira+Code:wght@400;500;700',
  },
  {
    id: 'ibm-plex-mono',
    label: 'IBM Plex Mono',
    kind: 'mono',
    stack: `"IBM Plex Mono", ${MONO}`,
    google: 'IBM+Plex+Mono:wght@400;500;600',
  },
];

export const DYNAMIC_FONTS_LINK_ID = 'od-dynamic-fonts';

export function getFont(id: string): FontOption {
  return FONT_LIBRARY.find((f) => f.id === id) ?? FONT_LIBRARY[0]!;
}

/**
 * Keeps ONE `<link id="od-dynamic-fonts">` in sync with the fonts currently in use.
 * SSR-safe: does nothing when `document` is unavailable.
 */
export function loadDynamicFonts(fontIds: string[]): void {
  if (typeof document === 'undefined') {
    return;
  }

  const families = Array.from(new Set(fontIds))
    .map((id) => getFont(id).google)
    .filter((g): g is string => Boolean(g));

  const existing = document.getElementById(DYNAMIC_FONTS_LINK_ID) as HTMLLinkElement | null;

  if (families.length === 0) {
    existing?.remove();

    return;
  }

  const href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;

  if (existing) {
    if (existing.href !== href) {
      existing.href = href;
    }

    return;
  }

  const link = document.createElement('link');
  link.id = DYNAMIC_FONTS_LINK_ID;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
