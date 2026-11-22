# Security and credential handling

This page describes the security boundaries currently implemented in UnQOps and the limitations that still need follow-up. It is not a substitute for reviewing the deployment and browser state of a particular installation.

## Credentials

- Never put secrets in `VITE_*` variables. Vite embeds these values in client bundles. Use server-side environment bindings for deployment credentials, or enter a user-owned provider key through the app.
- Provider API keys entered in the chat UI are sent to the same-origin `/api/api-keys` route and stored in an `HttpOnly; SameSite=Strict` cookie (`Secure` on HTTPS). The UI receives provider names/status only, not the saved key values. Existing script-readable `apiKeys` cookies are upgraded when the chat loads. The cookie is size-limited; deployments with many or unusually large keys should use server environment variables instead. An oversized legacy readable cookie is expired rather than left exposed.
- Normal model, chat, and prompt requests obtain keys on the server from the cookie or server environment. Credential-backed write routes require same-origin JSON requests, apply request-size limits, and return private/no-store responses.
- Exporting API keys is a separate, explicit action that downloads plaintext JSON. Treat that file as a secret, store it securely, and delete it when no longer needed. The general settings export deliberately omits API keys and connection credentials.
- `HttpOnly` prevents page JavaScript from reading the cookie directly; it does **not** prevent injected script from invoking authenticated same-origin APIs, and it does not protect credentials from the browser profile, the instance operator, or compromised deployment infrastructure. Host personal deployments only where you trust the operator and browser environment.
- GitHub, Netlify, Vercel, and Supabase connection flows still use browser-readable cookies, browser storage, or client-held state for provider access. The same `HttpOnly` guarantee does not apply to those integrations yet; avoid using a shared or untrusted browser for those connections and disconnect them when finished.

### Environment files

Keep `.env.local`, `.dev.vars`, `.env.production`, and other credential files out of Git. `.env.production` is now ignored and was removed from the tracked index in the hardening work, but that does not erase prior Git history, deployed bundles, backups, or build artifacts. Rotate any credential that may have been committed or published; deleting the file alone is not remediation.

## MCP servers

- MCP config updates are same-origin `POST` requests with a bounded JSON body. Server names, headers, server count, and transport URLs are validated.
- Hosted requests require HTTPS remote endpoints and reject IP literals and common local/test hostnames. Stdio and loopback endpoints are intended only for local development. MCP fetches disable redirects and status responses expose a filtered summary rather than headers, command arguments, or full URL paths/query strings.
- The full MCP configuration is held in page memory and is not persisted in `localStorage`. Only the non-secret sequential-step preference is persisted. After a reload, re-enter the complete config before saving edits; the UI may show a safe status summary restored from the HttpOnly session cookie.
- MCP sessions and live clients are currently held in process/isolate memory with a one-hour expiry, not in a durable shared store. Availability across worker isolates or restarts is not guaranteed.

**Known network risk:** URL validation is syntactic and the outbound fetch rechecks the hostname, but DNS resolution is performed by the runtime and is not pinned to a verified public IP. DNS rebinding and private-address resolution are therefore not fully mitigated. Do not expose remote MCP configuration to untrusted users until deployment-level egress controls or a transport with verified DNS pinning are added.

## API and deployment safeguards

- Chat, prompt-enhancement, LLM, MCP configuration, deployment, and Supabase query writes reject cross-origin requests and malformed or oversized JSON bodies. Error responses are sanitized and sensitive route responses use `private, no-store` and `X-Content-Type-Options: nosniff` where applicable.
- Git proxy access is constrained to safe clone discovery/upload-pack operations. Remote GitHub template import uses a bounded, filtered allowlist.
- Deployment uploads enforce aggregate size and path limits and exclude common environment, credential, private-key, and Git metadata files. Review the output files yourself before deployment; path filters cannot identify every application-specific secret.
- Supabase SQL is still executed using the supplied Supabase access token and project ID. Use a narrowly scoped token and a trusted project; the endpoint is not a SQL sandbox.

## UI preferences

Appearance preferences (mode, palette, colors, density, font scale, radius, elevation, and motion) are stored in this browser. Their values are sanitized before CSS variables are applied and do not contain credentials.

## Current verification and follow-up

As of 2026-11-21 on the active hardening branch:

- Focused credential, route, deployment, MCP, theme, and MCP-storage tests: **49 passed across 6 files**.
- Full Vitest suite: **79 passed, 1 failed across 9 files**. The remaining unrelated failure is `app/lib/runtime/message-parser.spec.ts` expecting `Foo bar ` but receiving `Foo bar <unqops`.
- ESLint, Prettier, and `git diff --check` pass. TypeScript reports only the existing missing generated `../build/server` module imported by `functions/[[path]].ts`; app sources otherwise type-check.
- The Vite development preview serves the root page with HTTP 200. A production build has not been revalidated in this continuation; a prior attempt terminated from Node heap exhaustion and reported a missing `si:netlify` UnoCSS icon.

Remaining high-priority items are DNS-safe MCP egress, moving GitHub/Netlify/Supabase connection credentials out of browser-readable storage, and choosing durable server-side storage for secrets/session-bound integrations. Removing a secret from the current tree does not remove it from repository history or existing deployments.
