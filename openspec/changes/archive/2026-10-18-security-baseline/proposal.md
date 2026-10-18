# Establish the desktop security baseline: CSP, navigation, permissions, remote resources

> Hardening change. The renderer currently has no Content-Security-Policy, accepts
> remote images inside node HTML, and the main process lets the renderer navigate
> with a string-prefix check. This change locks the boundary down without changing
> the product behaviour.

## Why

| # | Gap | Evidence |
| --- | --- | --- |
| 1 | **No CSP at all.** Any injected script (e.g. a sanitizer bypass) can read the plaintext API keys from IndexedDB and exfiltrate them via `fetch`. | `index.html` has no meta tag; main process never sets a response header |
| 2 | **Remote resources in node HTML.** Node content is sanitized but `<img src="https://tracker/…">` survives; rendering a mindmap silently phones home, contradicting the local-first/privacy promise (and leaks the user's IP). | `src/lib/html-sanitizer.ts` allows `src` on `img` |
| 3 | **Navigation check is a string prefix.** `url.startsWith('http://localhost:5173')` accepts `http://localhost:5173.evil.com`; any other URL — including `file:` and custom schemes — is passed to `shell.openExternal`. | `electron/main/index.ts` `will-navigate` |
| 4 | **No permission handler.** Electron's default permission behaviour applies; a compromised renderer could request camera/mic/geolocation. | no `setPermissionRequestHandler` anywhere |
| 5 | External links inside rendered HTML currently navigate the app window instead of opening in the system browser. | sanitizer leaves `href` untouched; no `target`/`rel` |

## What Changes

### 1. Content-Security-Policy (fixes #1)

- Pure policy builder in `src/lib/desktop-security.ts`
  (`buildContentSecurityPolicy(isDev)`): scripts locked to `'self'` in
  production (inline only in dev for Vite's React-refresh preamble), inline
  styles allowed (React Flow/Tailwind use style attributes), `connect-src`
  limited to `'self'` + `https:` + `http:` (user-configured LLM endpoints),
  `object-src`/`base-uri`/`form-action`/`frame-ancestors` disabled.
- Main process installs the policy as a response header via
  `session.defaultSession.webRequest.onHeadersReceived`.
- The production renderer build additionally gets a `<meta
  http-equiv="Content-Security-Policy">` injected at build time, so the policy
  also holds if a response header is unavailable for `file://` documents.

### 2. Navigation and external links (fixes #3, #5)

- `will-navigate` uses an **origin allowlist**: dev = the Vite dev-server origin
  (from `ELECTRON_RENDERER_URL`), production = `file:` URLs only.
- `shell.openExternal` is only called for `http:`/`https:` URLs; every other
  scheme is ignored. The same rule applies to `setWindowOpenHandler`.
- Sanitized HTML links to external sites get `target="_blank"` +
  `rel="noopener noreferrer"`, so they route through the window-open handler into
  the system browser instead of navigating the app.

### 3. Permission policy (fixes #4)

`setPermissionRequestHandler` + `setPermissionCheckHandler` deny everything by
default. The single allow-listed permission is `clipboard-sanitized-write`
(the "copy message" button); clipboard reads, media, geolocation and
notifications stay denied.

### 4. Remote resources in node HTML (fixes #2)

The sanitizer drops `src` from `<img>` unless it is a `data:`/`blob:` URL, so a
mindmap render cannot fetch remote resources. Text and alt stay visible.

## Non-goals

- Encrypting API keys with Electron `safeStorage` (needs a data-migration story;
  separate change).
- Wiring the renderer to the preload bridge (still Phase-0 scaffolding).
- Code signing / notarisation (release pipeline change).
- A full DOM-trust review of every component.

## Capabilities

### Modified Capabilities

- New capability `desktop-security` with requirements for CSP, navigation,
  permissions and remote-resource isolation.

## Impact

- Files: `electron/main/index.ts`, `electron.vite.config.ts`,
  `src/lib/html-sanitizer.ts`, new `src/lib/desktop-security.ts`,
  `AGENTS.md` (security section).
- Tests: CSP builder, URL predicates/navigation allowlist, permission allowlist,
  sanitizer remote-resource stripping + link externalisation.
- No persisted-data change; no UI redesign.
