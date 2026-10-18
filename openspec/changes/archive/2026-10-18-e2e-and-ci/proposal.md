# Add an Electron end-to-end smoke to CI and gate the production build

> Quality-gate change. The unit suite cannot catch packaging/build-time failures
> (a missing CSS dependency slipped through once) or "the app does not boot".

## Why

| Gap | Consequence |
| --- | --- |
| CI (`ci.yml`) runs tsc + eslint + vitest but **not** `npm run build` | A build-only failure (e.g. the removed `shadcn` CSS import) is only caught by the slower desktop pipeline, or after merge. |
| No end-to-end test at all | Nothing verifies that the packaged renderer boots, that the preload bridge is exposed, or that the main process starts without crashing under CI. |
| Playwright was declared and then removed as a dead dependency | E2E cannot regress silently because there is none. |

## What Changes

1. **CI build gate:** add `npm run build` to the `check` job so the production
   bundling (renderer + main + preload) is verified on every push/PR.
2. **Playwright Electron smoke:** add `@playwright/test` back with a minimal
   Electron launch test:
   - launches the built app (`electron .`, which loads `out/`),
   - asserts the app window opens with the expected title,
   - asserts the React root rendered (chat shell visible),
   - asserts the preload bridge (`window.api`) is exposed,
   - fails on uncaught renderer errors.
3. **CI e2e job:** new `e2e` job on ubuntu (Xvfb + Electron system deps):
   `npm ci → npm run build → npx playwright test`.
4. **Local workflow:** `npm run test:e2e` after `npm run build`; Playwright
   artifacts directories are git-ignored.

## Non-goals

- Full conversation/agent E2E with a mocked LLM (needs IndexedDB seeding and
  network mocking; separate change).
- Screenshot/visual regression tests.
- Windows/macOS e2e runners (Linux Xvfb is the canary; the app is identical).

## Capabilities

### Modified Capabilities

- New capability `quality-gates` with requirements for the CI build gate and the
  Electron E2E smoke.

## Impact

- Files: `.github/workflows/ci.yml`, `package.json`, `package-lock.json`, new
  `playwright.config.ts`, new `e2e/app.spec.ts`, `.gitignore`, `AGENTS.md`.
- No production code change.
