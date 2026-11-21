import * as Dialog from '@radix-ui/react-dialog';
import { useStore } from '@nanostores/react';
import { useState } from 'react';
import { PRESET_IDS, PRESET_STORAGE_KEY, resolvePreset, type PresetId } from '~/lib/theme-presets';
import { themeStore, toggleTheme } from '~/lib/stores/theme';

const swatches: Record<PresetId, string> = {
  default: '#87ea5c',
  ocean: '#0b6bcb',
  sunset: '#c2410c',
  forest: '#1f7a3d',
  monochrome: '#404040',
};

export function WorkspaceAppearance() {
  const theme = useStore(themeStore);
  const [preset, setPreset] = useState<PresetId>(() =>
    resolvePreset(typeof document === 'undefined' ? null : (document.documentElement.dataset.preset ?? null)),
  );

  const selectPreset = (value: PresetId) => {
    setPreset(value);
    document.documentElement.dataset.preset = value;

    try {
      localStorage.setItem(PRESET_STORAGE_KEY, value);
    } catch {
      // Appearance remains active for this session if storage is unavailable.
    }
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="appearance-trigger"
          aria-label="Customize appearance"
          title="Customize appearance"
        >
          <span className="i-ph:sliders-horizontal" aria-hidden="true" />
          <span className="appearance-trigger-label">Customize</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="appearance-overlay" />
        <Dialog.Content className="appearance-dialog">
          <div className="appearance-heading">
            <div>
              <Dialog.Title className="appearance-title">Customize appearance</Dialog.Title>
              <Dialog.Description className="appearance-description">
                Choose a palette and mode for your workspace.
              </Dialog.Description>
            </div>
            <Dialog.Close className="appearance-close" aria-label="Close appearance settings">
              <span className="i-ph:x" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <fieldset className="appearance-fieldset">
            <legend>Palette</legend>
            <div className="appearance-options">
              {PRESET_IDS.map((value) => (
                <label className="appearance-option" key={value}>
                  <input
                    type="radio"
                    name="workspace-preset"
                    checked={preset === value}
                    onChange={() => selectPreset(value)}
                  />
                  <span className="appearance-swatch" style={{ backgroundColor: swatches[value] }} />
                  <span className="appearance-option-label">{value}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="appearance-mode">
            <div>
              <strong>Color mode</strong>
              <span>Currently {theme}</span>
            </div>
            <button type="button" onClick={toggleTheme} className="appearance-mode-button">
              <span className={theme === 'dark' ? 'i-ph:sun' : 'i-ph:moon'} aria-hidden="true" />
              Switch to {theme === 'dark' ? 'light' : 'dark'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
