import { useStore } from '@nanostores/react';
import { Drawer } from '~/components/ui/Drawer';
import { closeThemeCustomizer, themeCustomizerOpenStore } from '~/lib/stores/theme';
import ThemePreferencesPanel from './ThemePreferencesPanel';

/** Live customizer sheet sharing the same persisted preferences as Settings → Appearance. */
export function ThemeCustomizerDrawer() {
  const open = useStore(themeCustomizerOpenStore);

  return (
    <Drawer open={open} onClose={closeThemeCustomizer} title="Theme Studio" size="md">
      <div className="p-4 sm:p-6">
        <ThemePreferencesPanel />
      </div>
    </Drawer>
  );
}
