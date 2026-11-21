# UnQOps workspace design direction

The current direction is independently interpreted from the OpenDesign workspace, not a copy of its assets or implementation. See [reference notes](analysis/open-design-analysis.md). Existing UnQOps functionality and `data-theme` / `bolt_theme` remain the source of truth.

| Role                | Light   | Dark    |
| ------------------- | ------- | ------- |
| Outer canvas / rail | #dfe9ec | #191f1e |
| Workspace           | #f9fbfa | #202524 |
| Raised surface      | #ffffff | #282e2c |
| Text                | #202420 | #f2f5f2 |
| Secondary text      | #555e58 | #bdc8c0 |
| Border              | #d9dfdc | #46504a |
| Focus               | #278438 | #8cde9a |

Inter with system fallbacks is used for UI; Georgia is used for the hero and system monospace for code. The layout pairs a compact navigation rail with a rounded workspace, subdued borders, a large composer and green highlights. The rail collapses below 1024px. Motion respects reduced-motion preferences.

| Area                 | Current treatment                                                                   |
| -------------------- | ----------------------------------------------------------------------------------- |
| Home and Git import  | Shared shell, centered hero, example actions and existing import controls           |
| Navigation           | Home, history, settings and theme use existing UnQOps behavior                      |
| Composer             | Rounded neutral container; provider, model, key, attachment and send logic retained |
| Chat / workbench     | Existing layout and controls inherit the semantic palette                           |
| Settings and dialogs | Existing flows retained; outer width constrained to the viewport                    |

This is a partial visual migration, not a completed audit of every screen or component. Some feature-specific utilities remain hard-coded and responsive behavior requires browser testing. No new OpenDesign functionality was added.

## Drive archive: Foundry adaptation

The supplied `open-design.zip` contains the Foundry Web Template, a standalone
Open Design-inspired template, not the Open Design app. Its default neutral
palette, Albert Sans typography, lime accent, rounded cards and sidebar inform
the UnQOps interface. The five Foundry palette color values are adapted to the
existing semantic tokens and can be selected via Customize; selections persist
locally and support light and dark modes. See `THIRD_PARTY_NOTICES.md` for
attribution. Existing chat, editor, history, settings and integrations remain
UnQOps implementations; Foundry's mock data and template routes are not imported.
This is a visual adaptation, not a claim that every Foundry template screen or
feature exists in UnQOps. Google Fonts requires network access and falls back to
system fonts.

### Shared-surface modernization

The settings overview now uses keyboard-operable, status-aware tiles. Shared
buttons, inputs, cards, dialogs, segmented controls, chat artifacts, preview
chrome and workbench panels use the existing palette-aware tokens. These changes
preserve each screen's existing actions and data handling. Some individual
integration and settings screens still have locally defined colors and layouts;
a full screen-by-screen visual and accessibility audit remains necessary.
