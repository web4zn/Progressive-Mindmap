# Tasks — e2e and CI gates

Legend: `[ ]` pending · `[x]` done.

## 1. Scaffolding

- [x] `proposal.md` + `tasks.md` + `specs/quality-gates/spec.md`.
- [x] `openspec validate e2e-and-ci --strict` passes.

## 2. CI build gate

- [x] `.github/workflows/ci.yml`: `npm run build` added to the `check` job.

## 3. Playwright Electron smoke

- [x] `package.json`: `@playwright/test` devDependency (1.64.1) + `test:e2e`
      script.
- [x] `playwright.config.ts`: `e2e/` testDir, 1 worker, CI reporter.
- [x] `e2e/app.spec.ts`: launches the built app (`electron .`), asserts window
      title, `#root`, chat input placeholder, `window.api` bridge and no
      uncaught renderer errors.
- [x] Strips `ELECTRON_RUN_AS_NODE` from the child env (some dev/sandbox
      environments set it globally; it makes Electron behave as plain Node and
      rejects Chromium switches).
- [x] Adds `--no-sandbox` on CI only (GitHub Linux runners restrict the SUID
      sandbox).
- [x] `vitest.config.ts` excludes `e2e/**` (Playwright owns those specs).
- [x] `tsconfig.json` includes `e2e/` + `playwright.config.ts` for typecheck.
- [x] `.gitignore`: `test-results/`, `playwright-report/`.
- [x] Local run: `npm run build && npm run test:e2e` → **3 passed** in 1.7 s.

## 4. CI e2e job

- [x] `.github/workflows/ci.yml`: `e2e` job (ubuntu, Electron runtime deps +
      xvfb) runs `npm ci → npm run build → xvfb-run -a npm run test:e2e`, uploads
      `playwright-report` on failure.

## 5. Verification

- [x] `npx tsc --noEmit` / electron tsconfig clean.
- [x] `npx eslint .` → 0 errors.
- [x] `npx vitest run` → 503 tests pass (e2e excluded).
- [x] `npm run build` passes.
- [x] `npm run test:e2e` passes locally (Windows).
- [ ] `npm run test:e2e` passes in CI (Linux/Xvfb) — verified by the PR run.
- [x] `openspec validate e2e-and-ci --strict` passes.
- [x] Version bumped to **1.0.4** per the AGENTS.md rule.

## 6. Wrap-up

- [ ] tasks checked; commit + push + PR + merge; archive this change.
