import { useStore } from '@nanostores/react';
import { memo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { buildPalette } from '~/lib/theme/apply';
import { getContrastRatio, isValidHex, normalizeHex, passesAA } from '~/lib/theme/contrast';
import { FONT_LIBRARY, getFont } from '~/lib/theme/fonts';
import { PRESETS } from '~/lib/theme/presets';
import type {
  Density,
  Elevation,
  FontScale,
  MotionSpeed,
  PaletteKey,
  RadiusStyle,
  SurfaceStyle,
  ThemeMode,
  ThemeStudioConfig,
} from '~/lib/theme/types';
import {
  exportThemeJson,
  importThemeJson,
  resetCustomColors,
  resetThemeStudio,
  resolvedModeStore,
  setCustomColor,
  setPreset,
  setThemeMode,
  themeStudioStore,
  updateThemeStudio,
} from '~/lib/stores/themeStudio';
import { classNames } from '~/utils/classNames';

type SectionId = 'presets' | 'colors' | 'typography' | 'style' | 'data';

const SECTIONS: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: 'presets', label: 'Presets', icon: 'i-ph:swatches' },
  { id: 'colors', label: 'Colors', icon: 'i-ph:palette' },
  { id: 'typography', label: 'Type', icon: 'i-ph:text-aa' },
  { id: 'style', label: 'Style', icon: 'i-ph:sliders-horizontal' },
  { id: 'data', label: 'JSON', icon: 'i-ph:file-code' },
];

interface ColorRow {
  key: PaletteKey;
  label: string;

  /** Foreground/background pair used for the WCAG badge. */
  against: { fg: PaletteKey; bg: PaletteKey };
}

const COLOR_ROWS: ColorRow[] = [
  { key: 'primary', label: 'Primary', against: { fg: 'primaryFg', bg: 'primary' } },
  { key: 'accent', label: 'Accent', against: { fg: 'accentFg', bg: 'accent' } },
  { key: 'secondary', label: 'Secondary', against: { fg: 'secondaryFg', bg: 'secondary' } },
  { key: 'bg', label: 'Background', against: { fg: 'fg', bg: 'bg' } },
  { key: 'surface', label: 'Surface', against: { fg: 'fg', bg: 'surface' } },
  { key: 'border', label: 'Border', against: { fg: 'border', bg: 'bg' } },
  { key: 'fg', label: 'Text', against: { fg: 'fg', bg: 'bg' } },
];

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-od-fg-muted">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-1 rounded-od-control border border-od-border bg-od-subtle p-1"
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={classNames(
              'flex-1 min-h-11 sm:min-h-8 rounded-od-control px-2 text-sm font-medium transition',
              value === o.value ? 'bg-od-primary text-od-primary-fg shadow-od-sm' : 'text-od-fg-muted hover:text-od-fg',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ContrastBadge({ ratio }: { ratio: number }) {
  const ok = ratio >= 4.5;

  return (
    <span
      className={classNames('shrink-0', ok ? 'od-badge-success' : 'od-badge-warning')}
      title={`Contrast ratio ${ratio.toFixed(2)}:1`}
    >
      {ok ? 'PASS AA' : 'Low Contrast'} · {ratio.toFixed(1)}
    </span>
  );
}

function ColorControl({ row, config }: { row: ColorRow; config: ThemeStudioConfig }) {
  const mode = useStore(resolvedModeStore);
  const palette = buildPalette(config, mode);
  const value = palette[row.key];
  const [draft, setDraft] = useState<string | null>(null);
  const ratio = getContrastRatio(palette[row.against.fg], palette[row.against.bg]);
  const isOverridden = Boolean(config.customColors[mode]?.[row.key]);

  const commit = (hex: string) => {
    if (isValidHex(hex)) {
      setCustomColor(mode, row.key, normalizeHex(hex));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-od-card border border-od-border bg-od-surface p-2.5">
      <input
        type="color"
        aria-label={`${row.label} color`}
        value={value}
        onChange={(e) => commit(e.target.value)}
        className="h-11 w-11 sm:h-9 sm:w-9 shrink-0 cursor-pointer rounded-od-control border border-od-border bg-transparent p-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-od-fg">
          {row.label}
          {isOverridden && <span className="size-1.5 rounded-full bg-od-accent" title="Customised" />}
        </div>
        <input
          aria-label={`${row.label} hex`}
          value={draft ?? value}
          maxLength={7}
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setDraft(null)}
          className="od-field mt-1 font-od-mono !min-h-9 !py-1 uppercase"
        />
      </div>
      <ContrastBadge ratio={ratio} />
      {!passesAA(palette[row.against.fg], palette[row.against.bg]) && row.key !== 'border' && (
        <p className="basis-full text-xs text-od-warning">
          This pair is below WCAG AA (4.5:1). Consider a stronger color.
        </p>
      )}
    </div>
  );
}

function FontSelect({
  slot,
  label,
  config,
}: {
  slot: 'heading' | 'body' | 'mono';
  label: string;
  config: ThemeStudioConfig;
}) {
  const current = config.fonts[slot];

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-od-fg-muted" htmlFor={`od-font-${slot}`}>
        {label}
      </label>
      <select
        id={`od-font-${slot}`}
        value={current}
        onChange={(e) => updateThemeStudio({ fonts: { ...config.fonts, [slot]: e.target.value } })}
        className="od-field"
      >
        {(['sans', 'serif', 'mono'] as const).map((kind) => (
          <optgroup key={kind} label={kind === 'sans' ? 'Sans-serif' : kind === 'serif' ? 'Serif' : 'Monospace'}>
            {FONT_LIBRARY.filter((f) => f.kind === kind).map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <p
        className="truncate rounded-od-control bg-od-subtle px-3 py-2 text-base text-od-fg"
        style={{ fontFamily: getFont(current).stack }}
      >
        The quick brown fox jumps over 13 lazy dogs
      </p>
    </div>
  );
}

function PreviewStrip() {
  return (
    <div className="od-card flex flex-wrap items-center gap-2 p-3" aria-label="Live preview">
      <button type="button" className="od-btn-primary !min-h-9">
        Primary
      </button>
      <button type="button" className="od-btn-accent !min-h-9">
        Accent
      </button>
      <button type="button" className="od-btn-secondary !min-h-9">
        Secondary
      </button>
      <span className="od-badge-success">Success</span>
      <span className="od-badge-warning">Warning</span>
      <span className="od-badge-danger">Danger</span>
      <span className="od-badge-info">Info</span>
    </div>
  );
}

interface ThemeStudioPanelProps {
  /** `drawer` = narrow single column, `page` = spacious grid for the Settings tab. */
  layout?: 'drawer' | 'page';
}

export const ThemeStudioPanel = memo(({ layout = 'drawer' }: ThemeStudioPanelProps) => {
  const config = useStore(themeStudioStore);
  const resolvedMode = useStore(resolvedModeStore);
  const [section, setSection] = useState<SectionId>('presets');
  const [importText, setImportText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const isPage = layout === 'page';
  const gridCls = isPage ? 'grid gap-3 md:grid-cols-2' : 'flex flex-col gap-3';

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportThemeJson());
      toast.success('Theme JSON copied to clipboard');
    } catch {
      toast.error('Could not access the clipboard');
    }
  };

  const downloadJson = () => {
    const url = URL.createObjectURL(new Blob([exportThemeJson()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unqops-theme.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyImport = (text: string) => {
    const result = importThemeJson(text);

    if (result.ok) {
      toast.success('Theme imported and applied');
      setImportText('');
    } else {
      toast.error(result.error);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (file) {
      applyImport(await file.text());
    }
  };

  return (
    <div className="flex flex-col gap-4" data-testid="theme-studio-panel">
      <PreviewStrip />

      <div
        role="tablist"
        aria-label="Theme Studio sections"
        className="flex gap-1 overflow-x-auto rounded-od-control border border-od-border bg-od-subtle p-1"
      >
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            onClick={() => setSection(s.id)}
            className={classNames(
              'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-od-control px-3 min-h-11 sm:min-h-8 text-sm font-medium transition',
              section === s.id ? 'bg-od-surface text-od-fg shadow-od-sm' : 'text-od-fg-muted hover:text-od-fg',
            )}
          >
            <span className={classNames(s.icon, 'text-base')} />
            {s.label}
          </button>
        ))}
      </div>

      {section === 'presets' && (
        <div className="flex flex-col gap-4">
          <Segmented<ThemeMode>
            label="Appearance"
            value={config.mode}
            onChange={setThemeMode}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
          <div className={classNames('grid gap-3', isPage ? 'sm:grid-cols-3' : 'grid-cols-2')}>
            {Object.values(PRESETS).map((p) => {
              const swatch = p.light;
              const active = config.presetId === p.id;

              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPreset(p.id)}
                  className={classNames(
                    'od-card flex flex-col gap-2 p-3 text-left transition hover:border-od-border-strong',
                    active ? '!border-od-primary ring-2 ring-od-primary/20' : '',
                  )}
                >
                  <div className="flex h-10 overflow-hidden rounded-od-control border border-od-border">
                    {[swatch.bg, p.dark.bg, swatch.primary, swatch.accent, p.dark.primary].map((c, i) => (
                      <span key={`${c}-${i}`} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-od-fg">{p.label}</div>
                    <div className="text-xs text-od-fg-muted">{p.description}</div>
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={config.presetId === 'custom'}
              onClick={() => setPreset('custom')}
              className={classNames(
                'od-card flex flex-col justify-between gap-2 border-dashed p-3 text-left transition hover:border-od-border-strong',
                config.presetId === 'custom' ? '!border-od-primary ring-2 ring-od-primary/20' : '',
              )}
            >
              <span className="i-ph:magic-wand text-2xl text-od-fg-muted" />
              <div>
                <div className="text-sm font-semibold text-od-fg">Custom</div>
                <div className="text-xs text-od-fg-muted">Start from default, pick your own colors.</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {section === 'colors' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-od-fg-muted">
            Editing colors for the current <strong className="text-od-fg">{resolvedMode}</strong> mode. Readable
            foreground colors are computed automatically.
          </p>
          <div className={gridCls}>
            {COLOR_ROWS.map((row) => (
              <ColorControl key={row.key} row={row} config={config} />
            ))}
          </div>
          <button type="button" className="od-btn-outline self-start" onClick={resetCustomColors}>
            <span className="i-ph:arrow-counter-clockwise" /> Reset colors
          </button>
        </div>
      )}

      {section === 'typography' && (
        <div className="flex flex-col gap-4">
          <div className={isPage ? 'grid gap-4 md:grid-cols-3' : 'flex flex-col gap-4'}>
            <FontSelect slot="heading" label="Heading font" config={config} />
            <FontSelect slot="body" label="Body font" config={config} />
            <FontSelect slot="mono" label="Code font" config={config} />
          </div>
          <Segmented<FontScale>
            label="Font scale"
            value={config.fontScale}
            onChange={(fontScale) => updateThemeStudio({ fontScale })}
            options={[
              { value: 'sm', label: 'S' },
              { value: 'md', label: 'M' },
              { value: 'lg', label: 'L' },
            ]}
          />
        </div>
      )}

      {section === 'style' && (
        <div className={isPage ? 'grid gap-4 md:grid-cols-2' : 'flex flex-col gap-4'}>
          <Segmented<RadiusStyle>
            label="Corner radius"
            value={config.radius}
            onChange={(radius) => updateThemeStudio({ radius })}
            options={[
              { value: 'sharp', label: 'Sharp' },
              { value: 'rounded', label: 'Rounded' },
              { value: 'pill', label: 'Pill' },
            ]}
          />
          <Segmented<Density>
            label="Spacing density"
            value={config.density}
            onChange={(density) => updateThemeStudio({ density })}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Comfy' },
              { value: 'spacious', label: 'Spacious' },
            ]}
          />
          <Segmented<Elevation>
            label="Elevation"
            value={config.elevation}
            onChange={(elevation) => updateThemeStudio({ elevation })}
            options={[
              { value: 'flat', label: 'Flat' },
              { value: 'soft', label: 'Soft' },
              { value: 'strong', label: 'Strong' },
            ]}
          />
          <Segmented<SurfaceStyle>
            label="Surface style"
            value={config.surfaceStyle}
            onChange={(surfaceStyle) => updateThemeStudio({ surfaceStyle })}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'glass', label: 'Glass' },
              { value: 'bordered', label: 'Bordered' },
            ]}
          />
          <Segmented<'on' | 'off'>
            label="Motion"
            value={config.motion.enabled ? 'on' : 'off'}
            onChange={(v) => updateThemeStudio({ motion: { ...config.motion, enabled: v === 'on' } })}
            options={[
              { value: 'on', label: 'On' },
              { value: 'off', label: 'Off' },
            ]}
          />
          <Segmented<MotionSpeed>
            label="Motion speed"
            value={config.motion.speed}
            onChange={(speed) => updateThemeStudio({ motion: { ...config.motion, speed } })}
            options={[
              { value: 'slow', label: 'Slow' },
              { value: 'normal', label: 'Normal' },
              { value: 'fast', label: 'Fast' },
            ]}
          />
        </div>
      )}

      {section === 'data' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="od-btn-secondary" onClick={copyJson}>
              <span className="i-ph:copy" /> Copy JSON
            </button>
            <button type="button" className="od-btn-secondary" onClick={downloadJson}>
              <span className="i-ph:download-simple" /> Download
            </button>
            <button type="button" className="od-btn-secondary" onClick={() => fileRef.current?.click()}>
              <span className="i-ph:upload-simple" /> Upload
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
          <textarea
            aria-label="Paste theme JSON"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='Paste theme JSON here, e.g. {"presetId":"ocean","radius":"pill"}'
            rows={6}
            className="od-field font-od-mono !py-2 text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="od-btn-primary"
              disabled={!importText.trim()}
              onClick={() => applyImport(importText)}
            >
              Apply JSON
            </button>
            <button
              type="button"
              className="od-btn-outline"
              onClick={() => {
                resetThemeStudio();
                toast.success('Theme reset to default');
              }}
            >
              <span className="i-ph:arrow-counter-clockwise" /> Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
