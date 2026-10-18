import { defineConfig } from '@playwright/test'

/**
 * Electron end-to-end smoke.
 *
 * The app is launched from the project root (`electron .`), which loads the
 * built `out/` bundle — run `npm run build` first. No browsers are downloaded;
 * Playwright drives the Electron binary from node_modules.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    trace: 'on-first-retry',
  },
})
