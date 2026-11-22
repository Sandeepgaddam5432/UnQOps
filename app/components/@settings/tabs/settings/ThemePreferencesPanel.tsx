import { useStore } from '@nanostores/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Switch } from '~/components/ui/Switch';
import {
  contrastRatio,
  ensureContrast,
  isHexColor,
  THEME_PRESET_LIST,
  type ThemeDensity,
  type ThemeElevation,
  type ThemeFontScale,
  type ThemeMode,
  type ThemeRadius,
  type ThemePreferences,
} from '~/lib/theme/theme-engine';
import { getThemeFontCss, THEME_FONTS, type ThemeFontId } from '~/lib/theme/fonts';
import {
  exportThemePreferences,
  getCurrentThemePalette,
  importThemePreferences,
  resetThemePreferences,
  setThemeColor,
  setThemeFont,
  themePreferencesStore,
  themeStore,
  updateThemePreferences,
} from '~/lib/stores/theme';
import { classNames } from '~/utils/classNames';

const selectClassName =
  'min-h-10 w-full rounded-lg border border-unqops-elements-borderColor bg-unqops-elements-background-depth-1 px-3 text-sm text-unqops-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-unqops-elements-focus';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-unqops-elements-borderColor pb-5 last:border-0 last:pb-0">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-unqops-elements-textSecondary">{title}</h3>
      {children}
    </section>
  );
}

function ColorField({ label, color, onChange }: { label: string; color: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(color.toUpperCase());
  const valid = isHexColor(draft);

  useEffect(() => {
    setDraft(color.toUpperCase());
  }, [color]);

  return (
    <div className="flex min-h-12 items-center gap-3 rounded-lg border border-unqops-elements-borderColor bg-unqops-elements-background-depth-1 p-2.5 text-sm text-unqops-elements-textPrimary">
      <input
        aria-label={`${label} color picker`}
        type="color"
        value={color}
        onChange={(event) => onChange(event.target.value)}
        className="size-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <span className="flex-1">{label}</span>
      <div className="min-w-0">
        <input
          aria-label={`${label} color hex`}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={7}
          value={draft}
          aria-invalid={!valid}
          onChange={(event) => {
            setDraft(event.target.value);

            if (isHexColor(event.target.value)) {
              onChange(event.target.value);
            }
          }}
          className="w-24 rounded border border-unqops-elements-borderColor bg-transparent px-2 py-1 font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-unqops-elements-focus"
        />
        {!valid && (
          <span className="mt-1 block text-[10px] text-unqops-elements-button-danger-text">Use #RGB or #RRGGBB</span>
        )}
      </div>
    </div>
  );
}

export default function ThemePreferencesPanel() {
  const preferences = useStore(themePreferencesStore);
  const resolvedTheme = useStore(themeStore);
  const palette = useMemo(() => getCurrentThemePalette(), [preferences, resolvedTheme]);
  const textContrast = contrastRatio(palette.fg, palette.bg);
  const buttonContrast = contrastRatio(palette.primaryFg, palette.primary);
  const accentTextColor = ensureContrast(palette.accent, palette.bg);
  const accentTextContrast = contrastRatio(accentTextColor, palette.bg);
  const importInputRef = useRef<HTMLInputElement>(null);

  const exportAppearance = () => {
    try {
      const url = URL.createObjectURL(new Blob([exportThemePreferences()], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'unqops-theme.json';
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      toast.error('Could not export theme settings.');
    }
  };

  const importAppearance = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    if (file.size > 64 * 1024) {
      toast.error('Theme JSON must be 64 KB or smaller.');
      return;
    }

    try {
      const parsed: unknown = JSON.parse(await file.text());

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Expected a theme settings object.');
      }

      importThemePreferences(parsed);
      toast.success('Theme settings imported. Unsupported values use safe defaults.');
    } catch {
      toast.error('Could not import theme settings. Choose a valid JSON theme file.');
    }
  };

  const setPreference = <Key extends keyof Pick<ThemePreferences, 'radius' | 'density' | 'elevation' | 'fontScale'>>(
    key: Key,
    value: ThemePreferences[Key],
  ) => {
    updateThemePreferences({ [key]: value } as Pick<ThemePreferences, Key>);
  };

  return (
    <div className="mb-6 space-y-5 rounded-xl border border-unqops-elements-borderColor bg-unqops-elements-background-depth-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-unqops-elements-textPrimary">Appearance</h2>
          <p className="mt-1 text-sm text-unqops-elements-textSecondary">
            Choose a palette and tune the app’s shape, density and motion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importInputRef}
            aria-label="Import theme JSON file"
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={importAppearance}
          />
          <button
            type="button"
            onClick={exportAppearance}
            className="min-h-10 rounded-lg border border-unqops-elements-borderColor px-3 text-sm font-medium text-unqops-elements-textSecondary transition-colors hover:bg-unqops-elements-item-backgroundActive hover:text-unqops-elements-textPrimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-unqops-elements-borderColorActive"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="min-h-10 rounded-lg border border-unqops-elements-borderColor px-3 text-sm font-medium text-unqops-elements-textSecondary transition-colors hover:bg-unqops-elements-item-backgroundActive hover:text-unqops-elements-textPrimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-unqops-elements-borderColorActive"
          >
            Import JSON
          </button>
          <button
            type="button"
            onClick={resetThemePreferences}
            className="min-h-10 rounded-lg px-3 text-sm font-medium text-unqops-elements-textSecondary transition-colors hover:bg-unqops-elements-item-backgroundActive hover:text-unqops-elements-textPrimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-unqops-elements-borderColorActive"
          >
            Reset appearance
          </button>
        </div>
      </div>

      <Section title="Color mode">
        <div role="group" aria-label="Color mode" className="grid grid-cols-3 gap-2">
          {(
            [
              ['light', 'Light'],
              ['dark', 'Dark'],
              ['system', 'System'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={preferences.mode === mode}
              onClick={() => updateThemePreferences({ mode: mode as ThemeMode })}
              className={classNames(
                'min-h-10 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-unqops-elements-borderColorActive',
                preferences.mode === mode
                  ? 'border-unqops-elements-borderColorActive bg-unqops-elements-item-backgroundAccent text-unqops-elements-item-contentAccent'
                  : 'border-unqops-elements-borderColor bg-unqops-elements-background-depth-1 text-unqops-elements-textSecondary hover:text-unqops-elements-textPrimary',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-unqops-elements-textTertiary">Current mode: {resolvedTheme}</p>
      </Section>

      <Section title="Theme preset">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {THEME_PRESET_LIST.map((preset) => {
            const colors = preset[resolvedTheme];
            const selected = preferences.preset === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => updateThemePreferences({ preset: preset.id, colors: {} })}
                className={classNames(
                  'flex min-h-[76px] items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-unqops-elements-borderColorActive',
                  selected
                    ? 'border-unqops-elements-borderColorActive bg-unqops-elements-item-backgroundAccent'
                    : 'border-unqops-elements-borderColor bg-unqops-elements-background-depth-1 hover:bg-unqops-elements-item-backgroundActive',
                )}
              >
                <span className="flex shrink-0 gap-1" aria-hidden="true">
                  {[colors.bg, colors.primary, colors.accent, colors.subtle].map((color) => (
                    <span
                      key={color}
                      className="size-4 rounded-full border border-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-unqops-elements-textPrimary">{preset.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-unqops-elements-textSecondary">
                    {preset.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Shape and spacing">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm text-unqops-elements-textSecondary">
            <span>Corner radius</span>
            <select
              className={selectClassName}
              value={preferences.radius}
              onChange={(event) => setPreference('radius', event.target.value as ThemeRadius)}
            >
              <option value="sharp">Sharp</option>
              <option value="rounded">Rounded</option>
              <option value="pill">Pill</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm text-unqops-elements-textSecondary">
            <span>Density</span>
            <select
              className={selectClassName}
              value={preferences.density}
              onChange={(event) => setPreference('density', event.target.value as ThemeDensity)}
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm text-unqops-elements-textSecondary">
            <span>Elevation</span>
            <select
              className={selectClassName}
              value={preferences.elevation}
              onChange={(event) => setPreference('elevation', event.target.value as ThemeElevation)}
            >
              <option value="flat">Flat</option>
              <option value="soft">Soft</option>
              <option value="strong">Strong</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm text-unqops-elements-textSecondary">
            <span>Text scale</span>
            <select
              className={selectClassName}
              value={preferences.fontScale}
              onChange={(event) => setPreference('fontScale', event.target.value as ThemeFontScale)}
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            ariaLabel="Enable motion"
            checked={preferences.motion}
            onCheckedChange={(motion) => updateThemePreferences({ motion })}
          />
          <span className="text-sm text-unqops-elements-textSecondary">Enable motion</span>
        </div>
      </Section>

      <Section title="Typography">
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ['heading', 'Heading font'],
              ['body', 'Body font'],
              ['mono', 'Monospace font'],
            ] as const
          ).map(([role, label]) => (
            <label key={role} className="space-y-1.5 text-sm text-unqops-elements-textSecondary">
              <span>{label}</span>
              <select
                aria-label={label}
                className={selectClassName}
                value={preferences.fonts[role]}
                onChange={(event) => setThemeFont(role, event.target.value as ThemeFontId)}
              >
                {THEME_FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="space-y-2 rounded-lg border border-unqops-elements-borderColor bg-unqops-elements-background-depth-1 p-4">
          <h3
            className="text-lg font-semibold text-unqops-elements-textPrimary"
            style={{ fontFamily: getThemeFontCss(preferences.fonts.heading) }}
          >
            A workspace that feels like yours
          </h3>
          <p
            className="text-sm text-unqops-elements-textSecondary"
            style={{ fontFamily: getThemeFontCss(preferences.fonts.body) }}
          >
            Preview your chosen heading and body typefaces together, with readable fallbacks if a font is unavailable.
          </p>
          <code
            className="block overflow-x-auto rounded-md bg-unqops-elements-background-depth-2 p-3 text-xs text-unqops-elements-textPrimary"
            style={{ fontFamily: getThemeFontCss(preferences.fonts.mono) }}
          >
            const theme = await studio.customize();
          </code>
        </div>
        <p className="text-xs text-unqops-elements-textTertiary">
          Google Fonts are requested only for selected typefaces; local system stacks remain as fallbacks.
        </p>
      </Section>

      <Section title="Color adjustments">
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['primary', 'Primary', palette.primary],
              ['accent', 'Accent', palette.accent],
            ] as const
          ).map(([role, label, color]) => (
            <ColorField key={role} label={label} color={color} onChange={(value) => setThemeColor(role, value)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={classNames(
              'rounded-full px-2.5 py-1 font-medium',
              textContrast >= 4.5
                ? 'bg-unqops-elements-item-backgroundAccent text-unqops-elements-item-contentAccent'
                : 'bg-unqops-elements-button-danger-background text-unqops-elements-button-danger-text',
            )}
          >
            Text contrast {textContrast.toFixed(1)}:1 {textContrast >= 4.5 ? 'AA' : 'check'}
          </span>
          <span
            className={classNames(
              'rounded-full px-2.5 py-1 font-medium',
              buttonContrast >= 4.5
                ? 'bg-unqops-elements-item-backgroundAccent text-unqops-elements-item-contentAccent'
                : 'bg-unqops-elements-button-danger-background text-unqops-elements-button-danger-text',
            )}
          >
            Primary button {buttonContrast.toFixed(1)}:1 {buttonContrast >= 4.5 ? 'AA' : 'check'}
          </span>
          <span className="rounded-full bg-unqops-elements-item-backgroundAccent px-2.5 py-1 font-medium text-unqops-elements-item-contentAccent">
            Accent text {accentTextContrast.toFixed(1)}:1 AA
          </span>
        </div>
      </Section>

      <p className="text-xs text-unqops-elements-textTertiary">Preferences are stored in this browser only.</p>
    </div>
  );
}
