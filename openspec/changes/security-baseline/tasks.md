# Tasks — security baseline

Legend: `[ ]` pending · `[x]` done.

## 1. Scaffolding

- [x] `proposal.md` + `tasks.md` + `specs/desktop-security/spec.md`.
- [x] `openspec validate security-baseline --strict` passes.

## 2. CSP

- [x] `src/lib/desktop-security.ts`: `buildContentSecurityPolicy(isDev)`.
- [x] `electron/main/index.ts`: install the policy via
      `session.defaultSession.webRequest.onHeadersReceived`.
- [x] `electron.vite.config.ts`: inject a production-only `<meta
      http-equiv="Content-Security-Policy">` via `transformIndexHtml`.
- [x] Tests for the policy builder (prod vs dev directives).

## 3. Navigation + external links

- [x] `isSameOrigin` / `isHttpUrl` / `isFileUrl` / `isAllowedAppNavigation`
      helpers.
- [x] `will-navigate` uses the origin allowlist (dev origin from
      `ELECTRON_RENDERER_URL`, prod `file:` only) instead of a prefix check.
- [x] `shell.openExternal` only for http(s); other schemes ignored (both
      `setWindowOpenHandler` call sites).
- [x] Tests for URL predicates and the navigation allowlist.

## 4. Permissions

- [x] `setPermissionRequestHandler` + `setPermissionCheckHandler`: deny by
      default, allow only `clipboard-sanitized-write`.
- [x] Tests for `shouldAllowPermission`.

## 5. Remote resources in node HTML

- [x] `html-sanitizer.ts`: drop non-`data:`/`blob:` `img[src]`; mark external
      links `target="_blank" rel="noopener noreferrer"`.
- [x] Tests: remote img stripped, data img kept, external link attributes.

## 6. Verification

- [x] `npx tsc --noEmit` → 0 errors.
- [x] `npx tsc --noEmit -p electron/tsconfig.json` → 0 errors.
- [x] `npx eslint .` → 0 errors / 7 warnings (pre-existing).
- [x] `npx vitest run` → 44 files / **503 tests passed** (490 + 13 new).
- [x] `npm run build` → passes; the built `out/renderer/index.html` contains the
      production CSP meta tag.
- [x] `openspec validate security-baseline --strict` passes.
- [x] Version bumped to **1.0.3** per the AGENTS.md rule.

## 7. Wrap-up

- [x] tasks checked; commit + push + PR + merge; release v1.0.3.
- [x] Archive this change after merge.
