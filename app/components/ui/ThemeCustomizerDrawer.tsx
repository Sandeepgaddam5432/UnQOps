import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import { ThemeStudioPanel } from '~/components/ui/ThemeStudioPanel';
import { themeCustomizerOpenStore } from '~/lib/stores/themeStudio';

/**
 * Non-blocking slide-over Theme Studio. There is intentionally no scrim, so the whole app stays
 * visible (and interactive) while the user tweaks colors, fonts and style tokens live.
 */
export function ThemeCustomizerDrawer() {
  const open = useStore(themeCustomizerOpenStore);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        themeCustomizerOpenStore.set(false);
      }
    };
    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <aside
      role="dialog"
      aria-label="Theme Studio"
      className="od-slide-in-right fixed inset-y-0 right-0 z-[10000] flex w-full flex-col border-l border-od-border bg-od-surface text-od-fg shadow-od-lg sm:w-[440px]"
    >
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-od-border px-4">
        <div className="flex items-center gap-2">
          <span className="i-ph:palette text-xl" />
          <div>
            <h2 className="text-base font-semibold leading-tight">Theme Studio</h2>
            <p className="text-xs text-od-fg-muted">Changes apply live across the whole app.</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close Theme Studio"
          className="od-btn-ghost !px-0 w-11 sm:w-9"
          onClick={() => themeCustomizerOpenStore.set(false)}
        >
          <span className="i-ph:x text-lg" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <ThemeStudioPanel layout="drawer" />
      </div>
    </aside>
  );
}
