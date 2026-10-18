# quality-gates Specification

## Purpose
TBD - created by archiving change e2e-and-ci. Update Purpose after archive.
## Requirements
### Requirement: CI verifies the production build

The `ci.yml` check job SHALL run `npm run build` (typecheck + electron-vite
production build) in addition to typecheck, lint and unit tests, so build-time
failures cannot merge.

#### Scenario: Build-only regression

- **WHEN** a change breaks the renderer or main-process bundle (e.g. a missing
  CSS/asset dependency that tsc and vitest cannot see)
- **THEN** the CI check job fails

### Requirement: Electron end-to-end smoke

The repository SHALL provide a Playwright Electron smoke test that launches the
built application (`out/`) and verifies:

- the app window opens with the expected title,
- the React root renders the chat shell,
- the preload bridge (`window.api`) is exposed on the renderer,
- no uncaught renderer error occurs during boot.

The test SHALL run in CI on Linux under Xvfb after `npm run build`, and SHALL be
runnable locally via `npm run test:e2e`.

#### Scenario: App boots

- **WHEN** `npm run test:e2e` runs after a successful build
- **THEN** the Electron window opens and the chat shell is visible
- **AND** `window.api` is an object

#### Scenario: Boot error fails the test

- **WHEN** the main process crashes or the renderer throws during boot
- **THEN** the e2e test fails

