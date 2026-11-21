# Supplied Foundry archive analysis

The Drive file `open-design.zip` (MD5 `25afe4879974e688bf36178b0ac7b858`)
contains Foundry Web Template, a standalone Vite/React/Tailwind 4 derivative
inspired by Open Design. It is not the Open Design application itself. Its
example dashboard and adapters use mock data; they cannot replace UnQOps chat,
provider, persistence, WebContainer, deployment, or Git functionality.

The default reference uses neutral white/grey surfaces, Albert Sans, bold
headlines, lime accents, rounded bordered controls/cards, and a desktop sidebar.
The archive also offers ocean, sunset, forest and monochrome presets, each with
light and dark colors. The UnQOps adaptation maps these palette values to its
existing semantic tokens and adds a local appearance selector. The app's own
navigation and workflows remain in place. Foundry template routes, mock data,
logos and branding are not imported. The full Foundry settings engine, every
individual template screen, live system-mode following, and font selection are
not implemented. Google Fonts may be unavailable; system sans is the fallback.

The archive's own NOTICE and Apache license are included under
`third-party/foundry/`; see `THIRD_PARTY_NOTICES.md`.

## Verification

`pnpm run lint`, production build, and typecheck passed after the adaptation.
Full test suite: 33 passed and one pre-existing incomplete-artifact parser test
failed (`Foo bar <unqops` rather than `Foo bar `). Browser visual, responsive,
keyboard and live provider integration checks could not be completed in this
sandbox because Chromium's NSS/NSPR shared libraries were unavailable. The
existing dependency audit reported significant advisories; this adaptation is
not a production-readiness or security certification.
