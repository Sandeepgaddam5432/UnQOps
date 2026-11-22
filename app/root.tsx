import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { initializeTheme, themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { THEME_FONTS } from './lib/theme/fonts';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
];

const serializedThemeFontRegistry = JSON.stringify(Object.fromEntries(THEME_FONTS.map(({ id, css }) => [id, css])));

const inlineThemeCode = stripIndents`
  (function setUnqopsTheme() {
    const root = document.documentElement;
    const fontRegistry = ${serializedThemeFontRegistry};
    const defaultFonts = { heading: 'albertSans', body: 'inter', mono: 'jetBrainsMono' };
    const allowed = {
      mode: ['light', 'dark', 'system'],
      preset: ['default', 'ocean', 'sunset', 'forest', 'monochrome'],
      radius: ['sharp', 'rounded', 'pill'],
      density: ['compact', 'comfortable', 'spacious'],
      elevation: ['flat', 'soft', 'strong'],
      fontScale: ['sm', 'md', 'lg'],
    };
    const densityScale = { compact: 0.88, comfortable: 1, spacious: 1.16 };
    const fontScale = { sm: 0.94, md: 1, lg: 1.08 };
    const radii = {
      sharp: { control: '0px', field: '0px', card: '0px', box: '0px', badge: '0px' },
      rounded: { control: '6px', field: '8px', card: '12px', box: '16px', badge: '999px' },
      pill: { control: '999px', field: '16px', card: '24px', box: '32px', badge: '999px' },
    };
    let settings = {};
    let legacyMode = null;

    try {
      const stored = JSON.parse(localStorage.getItem('bolt_theme_preferences_v1') || '{}');
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) settings = stored;
      legacyMode = localStorage.getItem('bolt_theme');
    } catch {
      settings = {};
    }

    const mode = allowed.mode.includes(settings.mode)
      ? settings.mode
      : legacyMode === 'dark' || legacyMode === 'light' ? legacyMode : 'light';
    const prefersDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = mode === 'system' ? prefersDark ? 'dark' : 'light' : mode;

    root.dataset.theme = theme;
    root.dataset.themePreset = allowed.preset.includes(settings.preset) ? settings.preset : 'default';
    root.dataset.themeRadius = allowed.radius.includes(settings.radius) ? settings.radius : 'rounded';
    root.dataset.themeDensity = allowed.density.includes(settings.density) ? settings.density : 'comfortable';
    root.dataset.themeElevation = allowed.elevation.includes(settings.elevation) ? settings.elevation : 'soft';
    root.dataset.themeMotion = settings.motion === false ? 'off' : 'on';
    root.style.colorScheme = theme;

    const density = allowed.density.includes(settings.density) ? settings.density : 'comfortable';
    const textScale = allowed.fontScale.includes(settings.fontScale) ? settings.fontScale : 'md';
    const radius = allowed.radius.includes(settings.radius) ? settings.radius : 'rounded';
    root.style.setProperty('--theme-density', String(densityScale[density]));
    root.style.setProperty('--theme-font-scale', String(fontScale[textScale]));
    root.style.setProperty('--theme-root-scale', String(densityScale[density] * fontScale[textScale]));
    const fontPreferences = settings.fonts && typeof settings.fonts === 'object' && !Array.isArray(settings.fonts)
      ? settings.fonts
      : {};
    Object.keys(defaultFonts).forEach((role) => {
      const candidate = fontPreferences[role];
      const fontId = Object.prototype.hasOwnProperty.call(fontRegistry, candidate) ? candidate : defaultFonts[role];
      root.style.setProperty('--theme-font-' + role, fontRegistry[fontId]);
    });
    Object.entries(radii[radius]).forEach(([name, value]) => root.style.setProperty('--theme-radius-' + name, value));
  })();
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    initializeTheme();
  }, [theme]);

  return (
    <>
      <ClientOnly>{() => <DndProvider backend={HTML5Backend}>{children}</DndProvider>}</ClientOnly>
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

import { logStore } from './lib/stores/logs';

export default function App() {
  const theme = useStore(themeStore);

  useEffect(() => {
    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
