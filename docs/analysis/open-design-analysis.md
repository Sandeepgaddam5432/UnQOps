# OpenDesign visual reference

Reviewed `nexu-io/open-design` at commit `e033aad1d15a9d4084316e5223f2c6597fd32619`, including its product-tour screenshots, `apps/web/src/styles/tokens.css` and home hero styles. The repository is Apache-2.0. This implementation is an independent interpretation; no reference code, images or branding were copied.

The reference combines a pale, tinted navigation ground with a large rounded light workspace, compact navigation, a centered Georgia headline, a broad rounded composer, neutral icons and restrained green highlights. The editor uses a conversation panel beside a rounded preview surface. It also provides a dark token set. UnQOps retains its own navigation, provider controls, chats, editor, runtime, settings and integrations instead of reproducing reference-only features.

## Implemented scope

The home and Git entry screens now share a desktop workspace rail, adapted hero, composer, example list, green-neutral token palette and light/dark surfaces. The rail uses the existing history and settings flows. On small screens it collapses to the existing header/navigation control. The chat and workbench inherit shared semantic colors. Settings and shared dialogs receive viewport width constraints.

## Remaining validation

This is not an exhaustive redesign of every nested settings, workbench, deployment or integration screen. Existing hard-coded styles still need migration and real browser testing across all breakpoints and integrations is required before claiming full responsiveness or parity. Browser capture in the sandbox was blocked by missing Chromium system libraries (`libnspr4.so`, `libnss3.so`, `libnssutil3.so`).
