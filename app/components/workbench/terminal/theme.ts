import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--unqops-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--unqops-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--unqops-elements-terminal-textColor'),
    background: cssVar('--unqops-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--unqops-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--unqops-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--unqops-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--unqops-elements-terminal-color-black'),
    red: cssVar('--unqops-elements-terminal-color-red'),
    green: cssVar('--unqops-elements-terminal-color-green'),
    yellow: cssVar('--unqops-elements-terminal-color-yellow'),
    blue: cssVar('--unqops-elements-terminal-color-blue'),
    magenta: cssVar('--unqops-elements-terminal-color-magenta'),
    cyan: cssVar('--unqops-elements-terminal-color-cyan'),
    white: cssVar('--unqops-elements-terminal-color-white'),
    brightBlack: cssVar('--unqops-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--unqops-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--unqops-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--unqops-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--unqops-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--unqops-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--unqops-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--unqops-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
