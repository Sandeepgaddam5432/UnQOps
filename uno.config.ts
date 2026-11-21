import { globSync } from 'fast-glob';
import fs from 'node:fs/promises';
import { basename } from 'node:path';
import { defineConfig, presetIcons, presetUno, transformerDirectives } from 'unocss';

const iconPaths = globSync('./icons/*.svg');

const collectionName = 'unqops';

const customIconCollection = iconPaths.reduce(
  (acc, iconPath) => {
    const [iconName] = basename(iconPath).split('.');

    acc[collectionName] ??= {};
    acc[collectionName][iconName] = async () => fs.readFile(iconPath, 'utf8');

    return acc;
  },
  {} as Record<string, Record<string, () => Promise<string>>>,
);

const BASE_COLORS = {
  white: '#FFFFFF',
  gray: { // Slate/Charcoal Palette
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#0D1117',
  },
  accent: { // Teal Palette
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },
  orange: {
    50: '#FFFAEB',
    100: '#FEEFC7',
    200: '#FEDF89',
    300: '#FEC84B',
    400: '#FDB022',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
    800: '#93370D',
    900: '#792E0D',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },
};

const od = (name: string) => `rgb(var(--od-${name}) / <alpha-value>)`;

/** Foundry semantic palette. Every entry supports opacity modifiers, e.g. `bg-od-bg/85`. */
const OD_COLORS = {
  bg: od('bg'),
  surface: od('surface'),
  subtle: od('subtle'),
  border: { DEFAULT: od('border'), strong: od('border-strong') },
  fg: { DEFAULT: od('fg'), muted: od('fg-muted'), soft: od('fg-soft') },
  primary: { DEFAULT: od('primary'), fg: od('primary-fg') },
  secondary: { DEFAULT: od('secondary'), fg: od('secondary-fg') },
  accent: { DEFAULT: od('accent'), fg: od('accent-fg') },
  success: od('success'),
  warning: od('warning'),
  danger: od('danger'),
  info: od('info'),
};

const COLOR_PRIMITIVES = {
  ...BASE_COLORS,
  alpha: {
    white: generateAlphaPalette(BASE_COLORS.white),
    gray: generateAlphaPalette(BASE_COLORS.gray[900]),
    red: generateAlphaPalette(BASE_COLORS.red[500]),
    accent: generateAlphaPalette(BASE_COLORS.accent[500]),
  },
};

export default defineConfig({
  safelist: [...Object.keys(customIconCollection[collectionName] || {}).map((x) => `i-unqops:${x}`)],
  shortcuts: {
    'unqops-ease-cubic-bezier': 'ease-[cubic-bezier(0.4,0,0.2,1)]',
    'transition-theme': 'transition-[background-color,border-color,color] duration-150 unqops-ease-cubic-bezier',
    kdb: 'bg-unqops-elements-code-background text-unqops-elements-code-text py-1 px-1.5 rounded-md',
    'max-w-chat': 'max-w-[var(--chat-max-width)]',

    // Foundry design-system shortcuts
    'od-focus-ring':
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-od-primary/40 focus-visible:ring-offset-0',
    'od-touch-target': 'min-h-11 min-w-11 sm:min-h-9 sm:min-w-9',
    'od-btn':
      'inline-flex items-center justify-center gap-2 rounded-od-control px-4 min-h-11 sm:min-h-9 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none od-focus-ring',
    'od-btn-primary': 'od-btn bg-od-primary text-od-primary-fg shadow-od-sm hover:bg-od-primary/90',
    'od-btn-secondary': 'od-btn bg-od-secondary text-od-secondary-fg border border-od-border hover:border-od-border-strong',
    'od-btn-outline': 'od-btn border border-od-border-strong text-od-fg bg-transparent hover:bg-od-subtle',
    'od-btn-ghost': 'od-btn text-od-fg-muted hover:text-od-fg hover:bg-od-subtle',
    'od-btn-accent': 'od-btn bg-od-accent text-od-accent-fg shadow-od-sm hover:brightness-95',
    'od-btn-danger': 'od-btn bg-od-danger text-white shadow-od-sm hover:brightness-95',
    'od-card': 'rounded-od-card border border-od-border bg-od-surface shadow-od-sm',
    'od-panel': 'rounded-od-box border border-od-border bg-od-surface shadow-od-md',
    'od-field':
      'w-full rounded-od-field border border-od-border bg-od-bg px-3 min-h-11 sm:min-h-9 text-sm text-od-fg placeholder:text-od-fg-soft transition focus:outline-none focus:border-od-primary focus:ring-2 focus:ring-od-primary/15',
    'od-badge': 'inline-flex items-center gap-1 rounded-od-badge border border-od-border bg-od-subtle px-2.5 py-0.5 text-xs font-medium text-od-fg-muted',
    'od-badge-success': 'od-badge border-od-success/30 bg-od-success/12 text-od-success',
    'od-badge-warning': 'od-badge border-od-warning/30 bg-od-warning/12 text-od-warning',
    'od-badge-danger': 'od-badge border-od-danger/30 bg-od-danger/12 text-od-danger',
    'od-badge-info': 'od-badge border-od-info/30 bg-od-info/12 text-od-info',
    'od-kbd': 'inline-flex items-center rounded-od-control border border-od-border bg-od-subtle px-1.5 py-0.5 font-od-mono text-xs text-od-fg-muted',
  },
  rules: [
    /**
     * This shorthand doesn't exist in Tailwind and we overwrite it to avoid
     * any conflicts with minified CSS classes.
     */
    ['b', {}],
  ],
  theme: {
    colors: {
      ...COLOR_PRIMITIVES,
      od: OD_COLORS,
      unqops: {
        elements: {
          borderColor: 'var(--unqops-elements-borderColor)',
          borderColorActive: 'var(--unqops-elements-borderColorActive)',
          // Semantic aliases used across the app
          border: 'var(--unqops-elements-borderColor)',
          focus: 'var(--unqops-elements-borderColorActive)',
          ring: 'var(--unqops-elements-borderColorActive)',
          background: {
            DEFAULT: 'var(--unqops-elements-bg-depth-1)',
            depth: {
              1: 'var(--unqops-elements-bg-depth-1)',
              2: 'var(--unqops-elements-bg-depth-2)',
              3: 'var(--unqops-elements-bg-depth-3)',
              4: 'var(--unqops-elements-bg-depth-4)',
            },
          },
          textPrimary: 'var(--unqops-elements-textPrimary)',
          textSecondary: 'var(--unqops-elements-textSecondary)',
          textTertiary: 'var(--unqops-elements-textTertiary)',
          code: {
            background: 'var(--unqops-elements-code-background)',
            text: 'var(--unqops-elements-code-text)',
          },
          button: {
            primary: {
              background: 'var(--unqops-elements-button-primary-background)',
              backgroundHover: 'var(--unqops-elements-button-primary-backgroundHover)',
              text: 'var(--unqops-elements-button-primary-text)',
            },
            secondary: {
              background: 'var(--unqops-elements-button-secondary-background)',
              backgroundHover: 'var(--unqops-elements-button-secondary-backgroundHover)',
              text: 'var(--unqops-elements-button-secondary-text)',
            },
            danger: {
              background: 'var(--unqops-elements-button-danger-background)',
              backgroundHover: 'var(--unqops-elements-button-danger-backgroundHover)',
              text: 'var(--unqops-elements-button-danger-text)',
            },
          },
          item: {
            contentDefault: 'var(--unqops-elements-item-contentDefault)',
            contentActive: 'var(--unqops-elements-item-contentActive)',
            contentAccent: 'var(--unqops-elements-item-contentAccent)',
            contentDanger: 'var(--unqops-elements-item-contentDanger)',
            backgroundDefault: 'var(--unqops-elements-item-backgroundDefault)',
            backgroundActive: 'var(--unqops-elements-item-backgroundActive)',
            backgroundAccent: 'var(--unqops-elements-item-backgroundAccent)',
            backgroundDanger: 'var(--unqops-elements-item-backgroundDanger)',
          },
          actions: {
            background: 'var(--unqops-elements-actions-background)',
            code: {
              background: 'var(--unqops-elements-actions-code-background)',
            },
          },
          artifacts: {
            background: 'var(--unqops-elements-artifacts-background)',
            backgroundHover: 'var(--unqops-elements-artifacts-backgroundHover)',
            borderColor: 'var(--unqops-elements-artifacts-borderColor)',
            inlineCode: {
              background: 'var(--unqops-elements-artifacts-inlineCode-background)',
              text: 'var(--unqops-elements-artifacts-inlineCode-text)',
            },
          },
          messages: {
            background: 'var(--unqops-elements-messages-background)',
            linkColor: 'var(--unqops-elements-messages-linkColor)',
            code: {
              background: 'var(--unqops-elements-messages-code-background)',
            },
            inlineCode: {
              background: 'var(--unqops-elements-messages-inlineCode-background)',
              text: 'var(--unqops-elements-messages-inlineCode-text)',
            },
          },
          icon: {
            success: 'var(--unqops-elements-icon-success)',
            error: 'var(--unqops-elements-icon-error)',
            primary: 'var(--unqops-elements-icon-primary)',
            secondary: 'var(--unqops-elements-icon-secondary)',
            tertiary: 'var(--unqops-elements-icon-tertiary)',
            warning: 'rgb(var(--od-warning))',
            info: 'rgb(var(--od-info))',
          },
          preview: {
            addressBar: {
              background: 'var(--unqops-elements-preview-addressBar-background)',
              backgroundHover: 'var(--unqops-elements-preview-addressBar-backgroundHover)',
              backgroundActive: 'var(--unqops-elements-preview-addressBar-backgroundActive)',
              text: 'var(--unqops-elements-preview-addressBar-text)',
              textActive: 'var(--unqops-elements-preview-addressBar-textActive)',
            },
          },
          terminals: {
            background: 'var(--unqops-elements-terminals-background)',
            buttonBackground: 'var(--unqops-elements-terminals-buttonBackground)',
          },
          dividerColor: 'var(--unqops-elements-dividerColor)',
          loader: {
            background: 'var(--unqops-elements-loader-background)',
            progress: 'var(--unqops-elements-loader-progress)',
          },
          prompt: {
            background: 'var(--unqops-elements-prompt-background)',
          },
          sidebar: {
            dropdownShadow: 'var(--unqops-elements-sidebar-dropdownShadow)',
            buttonBackgroundDefault: 'var(--unqops-elements-sidebar-buttonBackgroundDefault)',
            buttonBackgroundHover: 'var(--unqops-elements-sidebar-buttonBackgroundHover)',
            buttonText: 'var(--unqops-elements-sidebar-buttonText)',
          },
          cta: {
            background: 'var(--unqops-elements-cta-background)',
            text: 'var(--unqops-elements-cta-text)',
          },
        },
      },
    },
  },
  extendTheme: (theme: any) => ({
    ...theme,
    borderRadius: {
      ...theme.borderRadius,
      'od-control': 'var(--od-r-control)',
      'od-field': 'var(--od-r-field)',
      'od-card': 'var(--od-r-card)',
      'od-box': 'var(--od-r-box)',
      'od-badge': 'var(--od-r-badge)',
    },
    boxShadow: {
      ...theme.boxShadow,
      'od-sm': 'var(--od-shadow-sm)',
      'od-md': 'var(--od-shadow-md)',
      'od-lg': 'var(--od-shadow-lg)',
    },
    fontFamily: {
      ...theme.fontFamily,
      'od-heading': 'var(--od-font-heading)',
      'od-body': 'var(--od-font-body)',
      'od-mono': 'var(--od-font-mono)',
    },
  }),
  transformers: [transformerDirectives()],
  presets: [
    presetUno({
      dark: {
        light: '[data-theme="light"]',
        dark: '[data-theme="dark"]',
      },
    }),
    presetIcons({
      warn: true,
      collections: {
        ...customIconCollection,
      },
      unit: 'em',
    }),
  ],
});

/**
 * Generates an alpha palette for a given hex color.
 *
 * @param hex - The hex color code (without alpha) to generate the palette from.
 * @returns An object where keys are opacity percentages and values are hex colors with alpha.
 *
 * Example:
 *
 * ```
 * {
 *   '1': '#FFFFFF03',
 *   '2': '#FFFFFF05',
 *   '3': '#FFFFFF08',
 * }
 * ```
 */
function generateAlphaPalette(hex: string) {
  return [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].reduce(
    (acc, opacity) => {
      const alpha = Math.round((opacity / 100) * 255)
        .toString(16)
        .padStart(2, '0');

      acc[opacity] = `${hex}${alpha}`;

      return acc;
    },
    {} as Record<number, string>,
  );
}
