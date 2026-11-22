# UnQOps Security Hardening and UI Refresh — Continuity Notes

> **Status: in progress; not plan-complete.** The user explicitly authorized pushing the active branch as an intermediate checkpoint. This does not indicate that the broader plan or its gates are complete. Keep this file current and do not record credential values here.

**Last updated:** 2026-11-21 (UTC)

**Active branch:** `arena/6954c9ee-unqops`

**Branch base:** `b404698a59e7524ef83a4e49d940e5fda13f0877` (`main`)

**GitHub operation instruction:** Work only on this active branch. The user's latest explicit instruction authorizes pushing this branch now as an intermediate checkpoint, even though the plan is incomplete. Do not push to `main` or any other branch/repository.

## User's standing request

Keep project documentation and continuity notes current so that context is not lost between turns. The user most recently reiterated: “Anni kuda context miss avvakunda markdown lo maintained ga chesuko” — keep all important context maintained in Markdown. This file is intended to satisfy that request. If the user supplies a revised plan, update the scope and priorities here before proceeding.

## Active scope

Continue UnQOps security hardening together with the broader theme/UI refresh. The requested scope covers:

- Safer credential handling and API routes.
- Theme preferences and UI tokens.
- Responsive drawer/control panel and app shell, including Cloudflare Pages compatibility.
- Chat/workbench/settings and the remaining settings tabs.
- Security review, regression coverage, documentation, and a final audit.

The user authorized implementation of the detailed eight-stage Foundry redesign/Theme Studio/Cloudflare Pages plan. Its complete normalized scope and acceptance criteria are recorded in [`FOUNDRY_REDESIGN_PLAN.md`](./FOUNDRY_REDESIGN_PLAN.md). Work is in progress on the active branch; do not describe the overall plan as complete until its remaining scope and gates are resolved or explicitly accepted as deferred. The plan's conflicting branch/repository release steps remain blocked by the active-session rules.

## Work completed so far

### Provider API keys and import/export

- Added `app/routes/api.api-keys.ts` for server-mediated API-key status and updates. The status response exposes provider names, not key values. Updates are same-origin JSON requests and keys are stored in an `HttpOnly`, `SameSite=Strict` cookie (`Secure` on HTTPS), with validation and size/count limits.
- Legacy script-readable `apiKeys` cookies are upgraded through the server route; oversized legacy cookies are expired and rejected. Cookie parsing/validation is in `app/lib/api/cookies.ts`, with regression tests in `app/lib/api/cookies.spec.ts` and `app/lib/api/routes-security.spec.ts`.
- Explicit key export uses a deliberate same-origin POST to `/api/export-api-keys`; ordinary settings export omits API keys and connection credentials. Import/reset paths submit keys to the server, and API-key values are no longer kept in the undo-history snapshot.
- Chat/key-management code uses status and server submissions rather than reading/writing the API-key cookie in browser code.

### API, proxy, and deployment safeguards

- Chat, LLM-call, and prompt-enhancement routes use bounded JSON bodies, same-origin/content-type checks, cookie-derived provider keys, and sanitized errors. Relevant files include `app/routes/api.chat.ts`, `api.llmcall.ts`, `api.enhancer.ts`, and `app/lib/hooks/usePromptEnhancer.ts`.
- Git proxy discovery/upload-pack traffic and outbound HTTPS destinations were restricted; GitHub template import is allowlisted, bounded, and filtered. See `app/routes/api.git-proxy.$.ts` and `app/routes/api.github-template.ts`.
- Git-info and diagnostics responses were hardened. Vercel status credentials were moved away from GET query strings to POST JSON. Netlify deployment paths/names and upload handling, Supabase query handling, and deployment response caching/errors received additional safeguards.
- Shared deployment validation helpers and focused tests are in `app/lib/api/deployment-security.ts` and `app/lib/api/deployment-security.spec.ts`.
- Added the credential-session foundation in `app/lib/api/provider-credentials.server.ts` and `/api/credentials`: AES-256-GCM per-provider cookies use random 96-bit IVs, provider/version AAD, an authenticated seven-day expiry, a 32-byte server-only base64 key, host-only `__Host-` cookies on HTTPS, strict same-origin updates, bounded inputs, provider verification, safe status/profile responses, and legacy-cookie expiration. Missing key/crypto fails closed. This is not a claim that all provider integrations have migrated.
- Migrated the Supabase access-token path to that session: connection status, project listing, public-key lookup, and SQL actions now use the encrypted HttpOnly cookie server-side; the browser does not persist or attach the Supabase access token after initial same-origin connection. Legacy `supabase_connection` / `supabaseCredentials` values are removed without parsing. Only Supabase anon/public/publishable keys remain in UI memory by design; service-role/secret keys are filtered. `SupabaseAlert.tsx` was verified to submit SQL to the same-origin `/api/supabase/query` route.
- Reworked `ConnectionDiagnostics.tsx` to use `/api/credentials?verify=1` and `/api/system/diagnostics`. It displays only connection/verification booleans, does not read legacy storage values or make direct browser-to-provider API calls, and disconnects through the same-origin credential route before removing known legacy local-storage keys by name. `/api/credentials?verify=1` makes server-side provider checks but returns no profiles, upstream bodies, or credential values; route tests cover this behavior.
- Netlify, Vercel, and GitHub still have legacy browser-readable credential paths and are **not migrated yet**. The Cloudflare credential UI/deployment flow is also not implemented.
- TLS certificate validation was restored in `app/lib/fetch.ts`; earlier call-site review found no callers beyond its definition.

### MCP

- MCP configuration updates are same-origin and bounded. Full configuration/credentials are not persisted to local storage; only a bounded sequential-step preference persists. Existing `mcp_settings` is removed on initialization.
- MCP state is scoped through an HttpOnly session cookie and process/isolate memory. API responses expose filtered server summaries, not headers/commands/full sensitive URL details. MCP server validation and outbound URL checks reject a number of unsafe URL/transport patterns and redirects.
- Main files: `app/lib/api/mcp-security.ts`, `app/lib/api/mcp-network-security.ts`, `app/lib/services/mcpService.ts`, `app/lib/stores/mcp.ts`, `app/components/@settings/tabs/mcp/McpTab.tsx`.

### Theme and UI refresh

- Added a sanitized theme engine/store with live palette tokens, light/dark/system modes, responsive drawer support, preference bootstrap, and the shared Appearance panel.
- Added a finite font registry for heading/body/mono roles, with allowlisted dynamic Google Fonts loading and local/system CSS fallbacks. The initial inline bootstrap uses the same fixed registry; no arbitrary font names or URLs are accepted. Body/headings, Markdown/code, CodeMirror, and xterm now read the selected typography preferences.
- Added hex color editing with validation, bounded JSON theme import, secret-free JSON export, and one shared Theme Studio drawer state. The menu trigger and Settings → Appearance use the same preferences store/component; the drawer uses the existing Radix-backed responsive Drawer primitive.
- Refreshed the control panel and tab tiles; settings/chat and related pieces were adjusted for the new theme/shell.
- Main files include `app/lib/theme/`, `app/lib/stores/theme.ts`, `app/components/@settings/tabs/settings/ThemePreferencesPanel.tsx`, `ThemeCustomizerDrawer.tsx`, `app/components/ui/Drawer.tsx`, `app/components/@settings/core/ControlPanel.tsx`, `app/root.tsx`, `app/entry.client.tsx`, `app/styles/index.scss`, and `app/styles/variables.scss`.
- Appearance preference storage is non-secret; the security guide documents it. Font network reachability and visual/browser QA remain unverified.

### Chat streaming regression

- Fixed the message-parser regression where an incomplete `<unqops-quick-actions>` prefix could leak into visible output. The parser now buffers incomplete quick-action containers until complete, preserves the existing artifact/chunk behavior, and does not log quick-action labels or streamed content. Added a regression test without weakening the existing assertion.

### Documentation and repository hygiene

- Security guidance lives in `docs/docs/security.md` and is linked from `docs/docs/index.md`; the root `README.md` also points to it.
- `.env.production` was removed from the Git index and added to ignore rules. Removing it from the index does not erase Git history, deployed copies, backups, or artifacts. Rotate any credential that may have been exposed. A local ignored copy can remain on disk; never copy its contents into documentation or chat.
- The route-security test was moved from `app/routes/` to `app/lib/api/routes-security.spec.ts`; it imports runtime routes through the `~/routes/` alias so Remix does not discover a Vitest spec as a page route.

## Credential-session model (chosen; foundation implemented; migration in progress)

- Store provider connection tokens as **AES-256-GCM encrypted, per-provider cookies** with a random 96-bit IV and provider ID as authenticated additional data. Use a fixed provider-name allowlist and a versioned ciphertext format; never serialize plaintext token values into browser-readable storage.
- Cookies are `HttpOnly; SameSite=Strict; Path=/`, `Secure` on HTTPS, host-only (use the `__Host-` prefix on HTTPS), and expire after seven days. Bound each serialized credential/cookie value (2,500 UTF-8 plaintext bytes / 3,800 encoded cookie-value bytes); reject oversized values rather than truncating. The encrypted envelope has its own authenticated expiry, and disconnect expires that provider cookie. Rotation of the runtime key invalidates existing sessions and requires reconnect.
- The 32-byte AES key comes only from the server runtime secret `UNQOPS_CREDENTIALS_ENCRYPTION_KEY` (Cloudflare binding via `context.cloudflare.env`; Node/Docker via server environment). Never put it in `wrangler.toml`, `.env.example`, `VITE_*`, a client bundle, logs, or a report. Missing key or crypto failure must fail closed; production must not silently fall back to plaintext or process-local storage.
- The implemented `/api/credentials` route accepts bounded same-origin JSON `POST`s, checks `Origin` and rejects cross-site `Sec-Fetch-Site`, validates credentials with the provider before saving, returns only safe profile/presence data, and expires legacy readable cookies. Responses are private/no-store and errors are sanitized. Migrated provider data/deploy routes must decrypt server-side; after connection, tokens must not go in request JSON, query strings, response bodies, localStorage, or direct browser-to-provider calls. Supabase follows this rule now; GitHub/Netlify/Vercel still need migration.
- Cloudflare Pages/Workers and Node/Docker use the same Web Crypto cookie format and deployment-specific secret. Electron builds must use an OS-backed safe-storage/main-process adapter; if that adapter is absent, provider connections are disabled rather than embedding an app-wide key. This stateless cookie model has no server DB/KV dependency but requires a stable secret across instances and reconnects after key rotation. Same-origin actions can still be invoked by active XSS; this does not replace output encoding/CSP.

## Open work and risks

### P0 — Finish the connection-credential audit/migration

GitHub, Netlify, and Vercel still expose connection credentials to browser JavaScript in active paths. Supabase's access token has been migrated to the encrypted HttpOnly session; its intentionally public anon/publishable key can still be present in browser memory and is not a service-role secret. Do not describe the overall provider migration as complete.

- **GitHub:** `github_connection` local storage and readable `githubToken` / `git:github.com` cookies are used by `app/components/@settings/tabs/connections/GithubConnection.tsx`, `GitHubAuthDialog.tsx`, `RepositorySelectionDialog.tsx`, `PushToGitHubDialog.tsx`, `ConnectionForm.tsx`, and consumers such as `app/lib/stores/workbench.ts` / `app/lib/hooks/useGit.ts`. Some client requests send the token in `Authorization`; `app/routes/api.system.git-info.ts` currently accepts an Authorization bearer token. Audit Git-proxy authentication consumers too.
- **Netlify:** `netlify_connection` local storage holds the token in `app/lib/stores/netlify.ts` and the connection UI. `NetlifyDeploy.client.tsx` sends the token to `/api/netlify-deploy` in JSON and polls Netlify directly with it. `NetlifyConnection.tsx` and connection diagnostics also call Netlify directly.
- **Vercel:** `vercel_connection` local storage holds the token in `app/lib/stores/vercel.ts`; `VercelConnection.tsx`, deployment status components/stores, and `ConnectionDiagnostics.tsx` use it in browser requests. Earlier work moved one Vercel status credential out of a GET query, but that did **not** complete the broader Vercel credential migration.
- **Supabase:** the user access token now lives in the encrypted `supabase` HttpOnly cookie; `/api/supabase`, `/api/supabase/variables`, and `/api/supabase/query` obtain it server-side and reject legacy token fields/Authorization-based authentication. `supabase_connection` and `supabaseCredentials` are removed without reading their old values. The anon/public/publishable key is intentionally public and held in memory for project setup prompts; service-role/secret keys are never returned. Diagnostics now uses the server-side provider presence/verification response rather than reading these legacy keys.
- **Diagnostics:** the browser path has been migrated to safe status-only responses. The remaining migration risk is in GitHub, Netlify, and Vercel connection screens, stores, Git/deploy flows—not in `ConnectionDiagnostics.tsx`.
- `app/lib/services/importExportService.ts` already filters these connection keys from export/import, but this does not make their at-rest browser storage safe.

The stateless encrypted-cookie model is implemented as a foundation and used by Supabase, but it is not equivalent to durable server-side secret storage. HttpOnly prevents direct JavaScript reads but does not prevent XSS from invoking authenticated same-origin actions. Preserve same-origin/CSRF protections, no-store responses, and least-privilege provider scopes while migrating the remaining providers. Do not build a browser proxy that simply moves the same token into a different readable store.

### P0 — MCP DNS rebinding/private-address mitigation

`app/lib/api/mcp-network-security.ts` performs syntactic URL checks and redirects are rejected, but the runtime DNS answer is not pinned and verified as public before connection. DNS rebinding/private-address resolution remains unresolved. Add deployment-level egress controls or a transport that verifies and pins resolved addresses, with IPv4/IPv6 edge cases covered. Until then, do not claim complete SSRF/DNS-rebinding protection for hosted remote MCP servers.

### P1 — Stage 1/2 Theme Studio and final app/UI/Cloudflare audit

- The shared Theme Studio drawer, bounded theme JSON import/export, hex fields, and font-role controls are implemented; add browser-level interaction/accessibility checks and review visual behavior at narrow widths before calling these stages complete.
- Continue the responsive/UI review across the remaining tabs and workbench/chat surfaces, including mobile drawer behavior, keyboard/focus accessibility, light/dark/high-contrast states, and Cloudflare Pages route behavior.
- The shared encrypted credential route can validate/store a Cloudflare token and account ID, but Cloudflare connection UI, Pages build/upload/deploy routes, status handling, and deployment integration are not implemented. No live Cloudflare API or deploy has been called; live Cloudflare behavior remains **UNVERIFIED**.
- Review all auth/credential data paths with searches for `localStorage`, `document.cookie`, `js-cookie`, Authorization headers, token fields, `VITE_*`, diagnostics, logs, and import/export. Include Vercel, which was found in the code during this pass even though earlier notes listed only GitHub/Netlify/Supabase.
- Recheck that no Vitest/test files reside in Remix's `app/routes/` directory.
- Review `.env.production` removal, ignored local copies, and rotation implications. Git-index removal is not history scrubbing.

### P1 — Build/typecheck gates

- The initial `tsc --noEmit --pretty false` prerequisite was resolved by running the real production build first; it generates `build/server` and TypeScript then passes. Do not commit generated build output.
- The earlier full-test message-parser mismatch was fixed as an actual streaming bug and is covered by the regression assertion; no assertion was weakened.
- The latest production build succeeded with `NODE_OPTIONS=--max-old-space-size=2560 ./node_modules/.bin/remix vite:build` after transforming 5,327 client modules and 212 SSR modules. A 3,072 MB retry exited `-1` during chunk rendering without a diagnostic; a 2,048 MB retry reported JavaScript heap OOM. The 2,560 MB run passed. The `istextorbinary` `path.basename` issue was resolved by enabling the `path` Node polyfill in Vite, and the missing UnoCSS icon warning was fixed using the installed Phosphor `funnel-duotone` name. Remaining warnings include oversized chunks (the `Header` client chunk is about 3.75 MB), sourcemap location errors, empty route chunks, mixed static/dynamic imports, the experimental UnoCSS labeled variant, and framework deprecations.

## Latest verified state (2026-11-21 UTC)

- **Full Vitest suite:** **105 passed across 13 files**, including provider-credential presence/verification tests and the message-parser regression. No tests were skipped or weakened.
- **Focused theme/font/store tests:** 14 passed across 3 files, covering contrast/preferences, font registry and URL allowlisting/fallback, sanitized import/export, and shared customizer state.
- **ESLint:** full `app/` lint passed.
- **TypeScript:** `tsc --noEmit --pretty false` passed after a successful production build generated `build/server`; generated output must not be committed.
- **Production build:** `NODE_OPTIONS=--max-old-space-size=2560 ./node_modules/.bin/remix vite:build` exited 0 after transforming 5,327 client modules and 212 SSR modules. A 3,072 MB retry exited `-1` during chunk rendering without a diagnostic; a 2,048 MB retry reported heap OOM. The successful build still emits framework deprecations, sourcemap original-location errors for `Badge.tsx`, `ScrollArea.tsx`, and `Collapsible.tsx`, empty route chunks, the experimental UnoCSS labeled-variant warning, mixed static/dynamic imports, and large chunks (the `Header` client chunk is roughly 3.75 MB).
- **Diagnostics:** `/api/credentials?verify=1` and the rewritten UI report only encrypted-session presence and booleans for server-side provider checks. The diagnostics component no longer reads connection values from browser storage or calls provider APIs directly. Route tests confirm profiles and credential values are not included.
- **Supabase / preview:** `SupabaseAlert.tsx` posts SQL to `/api/supabase/query`. Vite's `allowedHosts` now permits `.e2b.app`; after the production build, the dev server was restarted on port 5173 (`0.0.0.0`) and the Arena preview Host header returned HTTP 200 (417,066 bytes).
- **Formatting / diff check:** Prettier checks passed for the modified diagnostics/API files and both continuity documents; `git diff --check` passed.
- **Unverified QA:** no browser visual/accessibility review, real GitHub/Netlify/Vercel connection check, live Cloudflare API call/deployment, or DNS-answer pinning has been performed.
- **Working tree:** large uncommitted change set; `.env.production` has a staged index deletion and an ignored local copy may remain. No commit or push has been made.

## Suggested next steps

1. Continue stage-by-stage from [`FOUNDRY_REDESIGN_PLAN.md`](./FOUNDRY_REDESIGN_PLAN.md); keep this status file current and preserve the current uncommitted branch state.
2. Migrate GitHub, Netlify, and Vercel connection/deployment/Git flows to the encrypted credential session. Diagnostics is migrated, but provider UI, stores, and direct calls still expose or submit tokens.
3. Implement DNS-safe MCP egress or a transport with real address verification and pinning; do not claim complete DNS-rebinding protection without enforceable controls.
4. Implement Cloudflare Pages connection/deployment integration with mocked-fetch tests; keep live Cloudflare deployment marked **UNVERIFIED** unless authorized credentials are actually used.
5. Continue responsive UI, settings, keyboard/focus/mobile QA, and remaining Foundry work. Browser visual/accessibility QA has not been performed.
6. Run the final typecheck, lint, full tests, production build, protection audit, and secret scan after the remaining implementation. The latest production build passed at a 2,560 MB Node heap; track remaining warnings without weakening checks. The plan is incomplete, but the user authorized an intermediate push of this active branch only; do not push `main` or treat that push as a release.

## Continuity update rule

After each significant implementation or verification pass, update **Last updated**, **Work completed**, **Open work and risks**, and **Latest verified state** here. Keep user decisions and exact blocker/test output, but do not record secrets, tokens, passwords, or private environment-file contents. If a result is unknown, mark it **not verified** rather than assuming success.
