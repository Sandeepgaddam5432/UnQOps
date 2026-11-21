# Onlook design analysis

Reference: `onlook-dev/onlook` commit `089840c3525faec88e74347bd5f7e06c76c8b3d0`, Apache-2.0. The current checkout is an Electron studio, not the older `apps/web` / `packages/ui` structure. Reviewed `apps/studio/src/theme/{neutralTheme,studioTheme}.ts` and renderer structure. No code or branded assets are copied.

## Color and typography

The studio is dark-only; its inherited neutral theme also defines light/dark pairs. Studio background body #000, surface #000000d9, muted #1a1a1a, card/popover #1f1f1f, text #fff / #acacac / #606060, border #494949, accent white, error #ff6666. Selection is #333; teal is #00deba and blue #90d1ff. Neutral light/dark pairs include body #f1f1f1 / #1b1b1b, surface #fff / #262626, text #171717 / #fafafa, secondary #737373 / #a3a3a3, border #00000014 / #ffffff1a, accent #262626 / #ebebeb, error #a50c25 / #ffc6c1. Focus uses accent or inset selection treatments; there is no separate explicit ring token in the studio theme.

Studio typography uses Inter Variable, base 13px and ratio 1.125, medium headings, JetBrains Mono Variable for code. Neutral theme uses Figtree at base 14px, ratio 1.2 and system monospace. Studio uses compact developer-tool hierarchy, thin borders, element radius 4px, container/chat 8px, page 12px. Neutral uses 6/10/12/28px. Studio shadows are 0 2px 5px #0000001a, 0 4px 10px #00000080, and 0 8px 20px #00000080; surfaces can be translucent with backdrop blur. Neutral motion tokens are 125/300/700ms. Layout uses compact panels, toolbars and a canvas rather than a conventional marketing page.

## Components and interaction

Studio extends Astryx component tokens for dialog, button, chat composer, tooltip, table and others; packages provide chat, git, onboarding and events. Buttons use neutral and semantic variants with hover/pressed/disabled states; panels and popovers use close dark surfaces and borders; tooltip has a dark ground; chat uses a compact rounded composer. Keyboard focus, dialogs, loading boundaries and region error boundaries appear in renderer code. Icons use Central Icons rounded outlined 1.5 stroke. Reference source delegates many variants, spacing values and control states to `@astryxdesign/core`; these cannot be exhaustively inferred from the theme overrides alone. No exhaustive viewport, interaction or component-state audit was performed.
