import { RemixBrowser } from '@remix-run/react';
import { initializeTheme } from './lib/stores/theme';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

initializeTheme();

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
