import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { PRESETS } from './lib/theme/presets';
import { initThemeStudio } from './lib/stores/themeStudio';
import { ThemeCustomizerDrawer } from './components/ui/ThemeCustomizerDrawer';
import { createHead } from 'remix-island';
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
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
  },
];

/**
 * Pre-paint script (zero FOUC): resolves light/dark from `unqops_theme_studio` / `bolt_theme` / OS preference
 * and writes the palette + `data-*` attributes before React hydrates. `initThemeStudio()` takes over afterwards.
 */
const inlineThemeCode = `
  (function () {
    try {
      var root = document.documentElement;
      var cfg = null;
      try { cfg = JSON.parse(localStorage.getItem('unqops_theme_studio') || 'null'); } catch (e) {}
      var legacy = localStorage.getItem('bolt_theme');
      var mode = (cfg && cfg.mode) || legacy || 'system';
      var resolved = mode === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
      root.setAttribute('data-theme', resolved);
      root.style.colorScheme = resolved;
      if (!cfg) return;
      var presets = ${JSON.stringify(PRESETS)};
      var base = (presets[cfg.presetId] || presets['default'])[resolved];
      var custom = (cfg.customColors && cfg.customColors[resolved]) || {};
      var toChannels = function (hex) {
        var h = String(hex).replace('#', '');
        if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
        var n = parseInt(h, 16);
        return ((n >> 16) & 255) + ' ' + ((n >> 8) & 255) + ' ' + (n & 255);
      };
      Object.keys(base).forEach(function (k) {
        var v = custom[k] || base[k];
        root.style.setProperty('--od-' + k.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }), toChannels(v));
      });
      root.setAttribute('data-preset', cfg.presetId || 'default');
      if (cfg.radius) root.setAttribute('data-radius', cfg.radius);
      if (cfg.density) root.setAttribute('data-density', cfg.density);
      if (cfg.elevation) root.setAttribute('data-elevation', cfg.elevation);
      if (cfg.surfaceStyle) root.setAttribute('data-surface-style', cfg.surfaceStyle);
      if (cfg.motion) root.setAttribute('data-motion', cfg.motion.enabled === false ? 'off' : 'on');
    } catch (e) {}
  })();
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#ffffff" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => initThemeStudio(), []);

  return (
    <>
      <ClientOnly>
        {() => (
          <DndProvider backend={HTML5Backend}>
            {children}
            <ThemeCustomizerDrawer />
          </DndProvider>
        )}
      </ClientOnly>
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
