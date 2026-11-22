# UnQOps Studio / Foundry Redesign — Canonical Plan

**Plan source:** the user's detailed eight-stage Foundry redesign prompt. This is a clean Markdown handoff of the requested scope and acceptance criteria; it intentionally does **not** reproduce any credential or token literal from the chat.

**Recorded:** 2026-11-21 (UTC)

**Related status file:** [`SECURITY_UI_CONTINUITY.md`](./SECURITY_UI_CONTINUITY.md)

**Plan status:** in progress / not complete. Recording this plan does not mean the implementation or any gate has passed.

> **Credential warning:** a GitHub personal access token was included literally in the user-supplied prompt. Treat it as exposed and revoke it. Never copy it into this file, scripts, environment examples, logs, reports, commits, archives, or tool arguments. Do not use that value. Use only the sandbox's configured GitHub authentication for any separately authorized GitHub operation.

## 1. Mission and priorities

Transform UnQOps (Remix + Vite + UnoCSS + WebContainer) into **UnQOps Studio**, using the Foundry design system, while preserving all existing behavior. Deliver a live Theme Studio/customizer and Cloudflare Pages deployment integration. The requested order of priority is:

1. Token and credential security.
2. No loss of existing functionality.
3. Green verification gates without weakening checks.
4. Foundry visual fidelity.
5. Speed.

Use existing project conventions, the design reference where safely available, and the least destructive implementation. Keep decision notes and verification status in Markdown; do not record secret values. Final chat should be in Tenglish, while source code, source comments, filenames, and commit messages remain standard English.

## 2. Current session and execution boundaries

This plan's original release target names `redesign/foundry` and a second public repository, `Sandeepgaddam5432/UnQOps-Studio`. The current Arena session is bound to the active branch `arena/6954c9ee-unqops`, based on `b404698a59e7524ef83a4e49d940e5fda13f0877`. Work must stay on that active branch; do not switch, create, rename, or push another branch. The user's latest instruction explicitly authorizes pushing this active branch as an intermediate checkpoint, despite the broader plan remaining incomplete; do not push `main`. This does **not** authorize a public release, the original `redesign/foundry` branch, or the second repository, which remain blocked. Do not create a repository or push anywhere else under this plan.

The implementation checkpoint `5fc6245` is committed and pushed to the active branch. Continue all work on this branch; do not replace it with a fresh clone of `main`, run `git checkout -B`, or use `git reset --hard`. Protect any later uncommitted work before recovery operations. `.env.production` is removed from the current branch tip, but its contents may remain in parent Git history, deployed copies, or backups; never expose them. Removing it from the tip does not clean Git history.

The original prompt proposes `/tmp/work_all/` for clone, logs, and checklists. Arena persists workspace files under the repository, not arbitrary `/tmp` files. Keep the canonical plan, decisions, progress, deviations, and test outcomes in this repository's Markdown continuity documents; temporary logs may be supplementary and must not contain secrets. The repository root remains `/home/user/UnQOps`.

### Environment limits known at plan capture

Outbound network access from this sandbox is restricted to `github.com`, `codeload.github.com`, `api.github.com`, `registry.npmjs.org`, `pypi.org`, and `files.pythonhosted.org`. The original direct downloads for Google Drive, `unqtools.pages.dev`, Google Fonts, and `api.cloudflare.com` may be blocked from shell tools. If an asset/source cannot be fetched, record a deviation and use a safe fallback; do not pretend it was retrieved. Cloudflare live deployment is unverified without authorized credentials; mocked-fetch tests are required and the report must say **UNVERIFIED — no live credential/deployment test**.

## 3. Security and implementation rules

- Never commit, push, log, or write credentials. Never echo environment state or print a token. Redact any unexpected credential-like output before showing it.
- Never put secrets in `VITE_*` variables: Vite exposes them to client code. The original Cloudflare plan's `VITE_CLOUDFLARE_API_TOKEN` fallback, `localStorage['cloudflare_connection']` token persistence, and browser-supplied deploy token conflict with priority 1 and must **not** be implemented as written. Decide a server-side/environment-binding or secure session model compatible with the supported Cloudflare Pages/Workers and other hosting modes. `HttpOnly` does not stop XSS from invoking authenticated same-origin endpoints and does not equal durable server-side secret storage.
- Existing GitHub, Netlify, Vercel, and Supabase credentials are still browser-accessible in parts of the current code. Include these in the credential audit/migration, not just Cloudflare. Diagnostics and imports/exports must not reveal them.
- Credential-backed writes must validate same origin, method, content type, bounded JSON, identifiers, and file paths. Return private/no-store responses and sanitized errors. Never log tokens or include them in error text.
- Do not weaken TypeScript, lint, test, or build checks. No blanket suppressions, deleted/skipped/weakened tests, fake implementations, placeholders, or claims that unverified behavior works.
- Keep external archives read-only. Inspect ZIP entry paths/content before extraction; never run code from the reference archive. Preserve a documented deviation if the reference is unavailable.
- Do not make a public release or create a second repository as an incidental step. The current session's branch restriction takes precedence over the old two-repository release target.

## 4. Protected contracts — preserve and test

### Runtime/UI hooks

- `#intro`; `menuVariants`; `enterThreshold=20` and `exitThreshold=20` in `Menu.client.tsx`.
- `workbenchVariants`, `--workbench-width`, and `sliderOptions` in `Workbench.client.tsx`.
- `layoutId="pill-tab"` in `Slider.tsx`.
- `.resize-handle-left`, `.resize-handle-right`, `BroadcastChannel`, iframe DOM order, and dynamic inline device width/height in `Preview.tsx`.
- `__boltArtifact__`, `__boltThought__`, `__boltQuickAction`, and `__boltSelectedElement__` in Markdown/chat/inspector code; postMessage payloads must remain identical.
- `localStorage` key `bolt_theme` and all existing exports from `app/lib/stores/theme.ts`: `kTheme`, `themeStore`, `toggleTheme`, `DEFAULT_THEME`, and `Theme`.
- `document.querySelector('textarea')`, `TEXTAREA_MIN_HEIGHT`, `TEXTAREA_MAX_HEIGHT`, Progress inline transform, LoadingOverlay inline width, and ChatDescription inline width.
- Preserve all existing 40+ features, stores, hooks, persistence, shortcuts, Remix routes, WebContainer behavior, component exports/prop contracts, and Radix bindings.

### Repository/code contracts

- The original plan's inventory expectation is 21 `api.*` routes. Measure the actual baseline before work; do not force the count to match the expected number. Stage 3 adds two Cloudflare API routes if implemented.
- Active app code should use the `~/` alias, not relative parent imports. The original grep is only a baseline check; extend verification to catch double-quoted, dynamic, and other import forms too.
- Preserve `verbatimModuleSyntax` using `import type { ... }` for type-only imports. Follow project formatting/lint conventions.
- The proposed dead-file list is only a starting point. Verify static, dynamic, barrel, and glob-based importers before treating any file as dead. The live service status tab is `providers/status/ServiceStatusTab.tsx`.

## 5. Staged implementation plan

### Stage 0 — Preflight, baseline, inventory (no commit)

- Record environment/tool versions, current branch/base, worktree state, network reachability, and actual project scripts. `pnpm` was unavailable in the earlier session; do not assume `corepack enable` or a fresh install is harmless. Use the repository's installed tooling where possible and record any deviation.
- Establish a baseline for typecheck, lint, tests, and build before changing code. Record real failures, counts, and commands. Current known baseline issues are listed in section 7.
- Inventory `app/routes/api.*`, existing features, the protected contracts above, theme exports, and connection/deployment flows. Review Netlify and Vercel types, stores, hooks, routes, deploy buttons/alerts, and deployment-link components before designing Cloudflare parity.
- Verify dead-file candidates have no importers. Do not delete files based only on a shallow grep.
- If the design ZIP is available, inspect its archive paths first, test archive integrity, then extract read-only to a separate workspace path. Read the relevant styles/components and record exact palette, font, radius, shadow, and motion decisions. If unavailable, use the user's Foundry requirements and current design tokens, record the deviation, and continue with safe fallbacks.
- Keep the persistent baseline/inventory in Markdown under `docs/`; do not rely exclusively on `/tmp` state.

**Stage 0 acceptance:** baseline and route/feature/protected-contract inventory recorded; reference extracted safely or deviation recorded; no existing work lost.

### Stage 1 — Logo, Theme Studio engine, Foundry tokens/styles, UnoCSS, class cleanup

- Integrate the requested `public/logo.svg` and favicon only if the official asset can be retrieved and inspected. Verify light/dark visibility and the root favicon path. If the external URL is blocked, record it and use a safe existing asset/fallback rather than claiming success.
- Build/extend `app/lib/theme/*` and a Theme Studio store without replacing the existing theme engine or breaking `app/lib/stores/theme.ts` exports. The proposed `ThemeStudioConfig` includes preset (`default`, `ocean`, `sunset`, `forest`, `monochrome`, `custom`), light/dark/system mode, safe custom palette, heading/body/mono fonts, scale, radius, density, elevation, surface style, and motion settings.
- Implement strict config validation: hex colors, enum whitelists, unknown-key filtering, prototype-pollution safety, bounded safe font names, and sanitized JSON import. Implement contrast helpers (`hexToRgbChannels`, `rgbChannelsToHex`, `getContrastRatio`, `passesAA`, `pickReadableForeground`). Test known contrast pairs, all preset/mode core pairs to AA 4.5, malformed/malicious input, and DOM application.
- Add an SSR-safe font registry/loader with a local/system fallback. Do not make runtime success depend on Google Fonts being reachable. Keep font names constrained to prevent URL injection.
- Apply `--od-*` RGB channel variables, `data-theme`, preset/radius/density/elevation/surface/motion attributes, fonts, and scale. Synchronize the new preference with legacy `bolt_theme`; prevent flash of unstyled content and avoid import-time `window` access. Consider CSP implications for inline bootstrap and external fonts.
- Add Foundry light/dark tokens and bridge existing `--unqops-elements-*`, `--cm-*`, and terminal variables; fix dark-mode cascade issues and light/dark pairs based on measured counts. Add reduced-motion behavior and semantic focus/scrollbar/diff tokens across stylesheets.
- Extend UnoCSS with opacity-capable semantic colors, radii, shadows, fonts, shortcuts, and missing semantic icons. Keep a permanent generator test for representative background/text/border opacity utilities.
- Run a codemod dry-run, review pattern counts/diff, then apply only verified transformations. Remove invalid/dark classes, undefined tokens, incorrect CSS vars, typos, and broken icons without changing protected preview/resize logic or active files' behavior.

**Stage 1 acceptance:** tests verify live token updates and safe import; no protected theme exports removed; UnoCSS generator test passes; no unreviewed broad codemod.

### Stage 2 — UI primitives and live Theme Customizer drawer

- Restyle active UI primitives in place, preserving exports, props, Radix bindings, behavior, and focus handling. Scope includes Button/IconButton/CloseButton, Badge, Card/GradientCard, panel headers, inputs/search/labels/checkbox/switch/chips/status/empty states/progress/loading, breadcrumb/scroll, theme switch/settings button/slider/tabs/dialog/popover/tooltip/code block/color scheme/repository/search result components.
- Use semantic Foundry tokens (including primary/accent foregrounds), consistent control/card radii, focus rings, interaction states, and responsive touch targets. Keep Progress and LoadingOverlay inline sizing logic intact. Use mobile bottom-sheet dialogs under 640px where appropriate and preserve keyboard/focus accessibility.
- Add a responsive Theme Customizer drawer driven by `themeCustomizerOpenStore`, with focus trapping, Escape close, accessible labels, and non-blocking live preview. Include preset and mode selection, color pickers plus hex fields, live AA badges, typography/font scale, radius/density/elevation/surface/motion settings, JSON import/export, and reset.
- Share controls and state with the settings Appearance/Theme Studio surface planned in Stage 6; do not build two independent preference systems.
- Test open/close, preset application, invalid JSON rejection, keyboard behavior, and DOM preference updates.

**Stage 2 acceptance:** drawer and active primitives pass behavior/accessibility tests with no public component contract loss.

### Stage 3 — App shell and Cloudflare Pages deployment

#### Shell

- Apply Foundry tokens to `_index.tsx`, `git.tsx`, and `webcontainer.preview.$id.tsx`; remove decorative backgrounds only where behavior remains unchanged.
- Restyle Header, ChatDescription, HeaderActionButtons, Menu, HistoryItem, and AvatarDropdown. Add the Theme Studio trigger and Cloudflare deployment link. Preserve menu proximity behavior, `menuVariants`, intro hooks, responsive navigation, and Settings actions.

#### Cloudflare integration

- Add typed Cloudflare project/deployment/stats/connection models, but **do not persist the API token in localStorage or expose it through VITE**. Define a secure credential-storage/session model first. Account ID may be non-secret metadata; token handling is secret.
- Add same-origin Cloudflare account/project status and deploy routes. Validate account/project identifiers, request body, files, names, paths, sizes, and counts. Use least-privilege Cloudflare Pages permissions. Keep tokens out of browser-readable responses, logs, URLs, and errors.
- Verify Cloudflare Pages Direct Upload against an authoritative, pinned Wrangler implementation/API reference before coding: upload-token retrieval, missing-hash check, asset upload/batching, hash upsert, multipart deployment manifest, branch, and final status. Confirm the BLAKE3/hash input/extension algorithm and Worker-compatible implementation; do not infer it from the prompt alone.
- Enforce per-file and aggregate limits, file count limits, safe content types/paths, and clear sanitized errors. Return only deployment/project metadata.
- Add mocked-fetch tests for project exists/create, auth failure, each upload failure point, successful deployment, size/path rejection, and secret-free responses/logging. Live Cloudflare deploy remains unverified unless performed with authorized credentials.
- Add a deployment hook that builds in WebContainer, finds `dist/` or `build/`, collects files safely, submits to same-origin route, reports progress through existing deploy alerts, and stores only the project ID per chat. Add Cloudflare deployment-link/button/alert integration while preserving Netlify/Vercel behavior.

**Stage 3 acceptance:** mocked route tests pass; no Cloudflare secret in VITE/localStorage/client response; UI wiring and Cloudflare Pages route behavior documented; live deployment clearly marked verified or unverified.

### Stage 4 — Landing hero, composer, and chat stream

- Restyle BaseChat hero and transition while preserving `#intro` and stream behavior.
- Restyle ChatBox as a Foundry composer and preserve ModelSelector, APIKeyManager, image attachment, prompt enhancer, speech, MCP, color scheme, Supabase, and send actions. Preserve textarea query and min/max height logic. Keep send/CTA semantics accessible.
- Refresh example prompts, starter templates, imports, folder/git clone/export actions, model/key controls, file preview, MCP, and speech controls without removing features.
- Restyle message, user/assistant, Markdown/code block, artifacts, thoughts, tools, compilation progress, alerts, deployment links, and Git import. Keep Markdown artifact/postMessage identifiers and protocol unchanged; synchronize code themes with semantic tokens.
- In `Chat.client.tsx`, restrict edits to toast container presentation/icons unless a separate approved need is proven; do not touch streaming, WebContainer, or selected-element logic.

**Stage 4 acceptance:** protected message/streaming contracts unchanged and chat action regression tests pass.

### Stage 5 — Workbench IDE

- Restyle Workbench shell and Code/Diff/Preview controls while preserving `workbenchVariants`, width CSS variable, slider behavior, and layout.
- Refresh editor panel, breadcrumbs, file tree/context menu, file icons, search, locks, binary viewer, and CodeMirror theme using live semantic CSS variables.
- Refresh DiffView, Preview toolbar, port/device selectors, QR modal, Inspector, ScreenshotSelector, terminal/tabs/theme. Replace raw colors with semantic variables and ensure theme change updates live.
- Preserve resize classes, iframe order, BroadcastChannel, dynamic inline viewport dimensions, device interactions, and inspector postMessage payload. Do not alter protected preview/resize communication to achieve styling.

**Stage 5 acceptance:** IDE interactions, resizing, preview messaging, device sizes, editor, diff, and terminal remain functional across themes.

### Stage 6 — Settings core, Appearance/Theme Studio, primary tabs

- Restyle ControlPanel and TabTile using semantic tokens; keep responsive navigation and existing tab selection/persistence.
- Add or extend the Appearance/Theme Studio settings surface and register it through the existing tab configuration mechanism. Share Theme Studio store/components with the drawer; do not duplicate state.
- Refresh Profile, Settings, Features, Notifications, Data, visualizations/charts, MCP tab/server list/status. Chart colors must read CSS variables and update on theme changes.
- Preserve data/import/export behavior, MCP warnings/session semantics, keyboard navigation, and all existing settings features.

**Stage 6 acceptance:** all settings tabs render and function; drawer/settings appearances stay synchronized; chart/theme changes verified.

### Stage 7 — Provider/deployment tabs, Cloudflare connection, dialogs

- Add Cloudflare connection UI with Account ID, password-masked token input, least-privilege help, connect/disconnect/status, projects, deployment links/time, and diagnostics. The credential must use the secure storage/session model from Stage 3, not localStorage or VITE.
- Audit/migrate GitHub, Netlify, Vercel, and Supabase credentials and all direct browser provider calls. Route diagnostics through safe status-only APIs. Remove legacy readable cookies/localStorage values as part of migration; ensure import/export and logging remain redacted.
- Restyle provider tabs and dialogs: Cloud/Local providers, Ollama installer, live ServiceStatusTab, Event Logs, Connections, GitHub/Netlify/Vercel, diagnostics, repository selection/push/auth, stats, repository cards/lists. Treat a file as dead only after full importer verification.
- Preserve deployment APIs, account scopes, repo permissions, and existing deployment statuses. Keep tokens out of URL query strings and logs.

**Stage 7 acceptance:** connection flows pass secure route and UI regression tests; no browser-readable provider token remains in audited active paths, or any accepted exception is explicitly documented with scope/reason.

### Stage 8 — Final sweep, QA, audit, release

- Search active app files for raw purple/violet/fuchsia/gray/zinc styles, broken dark classes, undefined tokens, raw hex colors, and client-readable credentials. Replace with semantic tokens only after checking intent. Use robust parsing/search, not one fragile grep pattern.
- Test responsive overflow at 320/375/768/1440 widths, keyboard/focus behavior, touch targets, bottom-sheet dialogs, and light/dark/custom themes. If Playwright/screenshots cannot run, do static checks and report visual verification as **UNVERIFIED**.
- Run contrast matrix on all presets/modes and custom palette logic; no core AA pair failures.
- Run protected-contract/route checks, secret scan over worktree/diff/history/config/archives, typecheck, lint, all tests, and production build. Ensure scripts fail closed and preserve pipeline exit status. Secret scanners should report locations/counts only, never matched secret text.
- Verify no test file is discovered as a Remix route. Verify preview, production routes, Cloudflare mocked-fetch behavior, and deployment integration; live external deploy status must be explicit.
- Only after user-approved plan completion and all gates pass may a public release be considered. The user's latest instruction separately authorizes an intermediate push of the current active branch; such a push does not satisfy Stage 8 or mark the plan complete. Do not push `main`, `redesign/foundry`, another branch, or another repository, and do not create the second repository here.
- If a delivery ZIP is separately authorized, keep it out of Git unless explicitly required. Inspect patch contents before archiving: a diff that deletes `.env.production` may still contain the deleted secret lines. Exclude/redact sensitive paths and scan archive contents without printing matches. Never copy an unreviewed full-repository patch into `public/`.

**Stage 8 acceptance:** all applicable gates have real recorded results; all unverified items and deviations are explicit; no secret is in source, diff, history being published, logs, report, or archive; release target follows current branch rules.

## 6. Required gates and evidence

The original desired gate sequence is typecheck, lint, full tests, production build, protection audit, and secret scan. Use actual package scripts present in the repository; if `pnpm` is unavailable, record the setup issue and use equivalent installed binaries without relaxing checks. Run targeted checks after fixes, then the full sequence. A gate is green only if the command actually exits 0. Capture concise evidence and exact counts in `SECURITY_UI_CONTINUITY.md`; do not claim a screenshot, live deployment, or build that was not run.

The original protection audit requests:

- Every protected contract still exists and behaves equivalently; count-only grep is insufficient by itself.
- No parent-relative app imports; check static/dynamic and quote styles.
- Baseline API routes remain, plus two Cloudflare routes if implemented.
- Existing theme store exports remain.

The original secret scan requests patterns for GitHub token formats and long bearer strings across source, Git history/patches, Git config/remotes, notes, logs, and ZIP contents. Never put a literal secret into the scanner source. Ensure the scanner does not print matched values. Rotate exposed credentials; a clean current tree does not erase historical or deployed copies.

## 7. Current known baseline and unfinished work

As of 2026-11-21 UTC (latest verification in this work session):

- Full Vitest: **105 passed across 13 files**, including provider credential route coverage for status-only verification. No test was skipped or weakened.
- Full `app/` ESLint passed. `tsc --noEmit --pretty false` passed after the production build generated `build/server`; do not commit generated output.
- Prettier checks for the changed files and `git diff --check` passed after the latest code changes; rerun after any further edits.
- Production build passed with `NODE_OPTIONS=--max-old-space-size=2560 ./node_modules/.bin/remix vite:build`: client bundle transformed 5,327 modules and SSR transformed 212. A 3,072 MB retry exited `-1` during chunk rendering without a diagnostic; a 2,048 MB retry reported JavaScript heap OOM. The 2,560 MB run completed successfully.
- The successful build still reports framework deprecations, sourcemap location errors for `Badge.tsx`, `ScrollArea.tsx`, and `Collapsible.tsx`, empty route chunks, an experimental UnoCSS labeled variant, mixed static/dynamic imports, and oversized chunks (including `Header` at roughly 3.75 MB).
- Vite now allows the Arena `.e2b.app` preview host. A request using the preview Host header returned HTTP 200. `SupabaseAlert.tsx` was verified to post SQL to `/api/supabase/query`.
- Connection diagnostics now use `/api/credentials?verify=1` for server-side encrypted-session presence/provider verification and only display booleans; they no longer read legacy storage values or call provider APIs directly. Route tests verify secret/profile data is not returned.
- Supabase's access-token session is migrated. GitHub, Netlify, and Vercel connection screens, stores, deploy/status paths, and Git flows still contain browser-readable or browser-supplied tokens; those migrations remain incomplete. MCP DNS-answer pinning and Cloudflare Pages deployment integration also remain open.
- Browser visual/accessibility QA, a live Cloudflare API call/deployment, and real provider connections remain unverified. Implementation checkpoint `5fc6245` (`Harden provider sessions and refresh Foundry UI`) is pushed to `arena/6954c9ee-unqops` only; `main` was not pushed. `.env.production` is removed from the branch tip, but its parent history/deployed copies and credential rotation remain separate risks.

## 8. Safe recovery/failure procedure

1. Read the latest continuity note, this plan, `git status`, and the latest real test/build logs. Do not assume `/tmp` survived a context reset.
2. Identify the root cause and rerun only the failing command, then rerun the full gate. Do not hide output that may contain secrets; redact before sharing.
3. Review only the changes made since a safe checkpoint. Avoid broad resets.
4. Before reverting, preserve the whole existing worktree (including staged and untracked files) using a method that does not expose secrets. A Git tag alone is not a backup of uncommitted files. Never use `git reset --hard` as a generic failure step here.
5. If a plan item is blocked, use a documented safe fallback, record the deviation and its impact, and continue only within the approved scope. Never push a failing/partial stage.

## 9. Final report requirements

When the approved plan is actually complete, report stage-by-stage results and commit identifiers, theme/logo/Cloudflare features, exact test/build outputs, protection and secret scan results, deviations, unverified items, deployment connection steps, and authorized release links. Never reproduce a credential. Do not claim both GitHub repositories or requested branches were published unless that exact operation was allowed and verified. End-of-report wording from the original plan should only be used if truthful and must not imply a token is still live or has been exposed safely.

## 10. Continuity update rule

After each significant implementation or verification, update both this plan's relevant status and [`SECURITY_UI_CONTINUITY.md`](./SECURITY_UI_CONTINUITY.md): last-updated date, completed work, open risks, exact test/build status, decisions/deviations, and next step. Keep secrets out of all Markdown. If a result is unknown, mark it **not verified**. If the user changes scope, preserve this plan's history and add the revised decision rather than silently replacing the old acceptance criteria.
