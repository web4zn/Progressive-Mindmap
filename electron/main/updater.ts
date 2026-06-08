/**
 * Auto-updater stub.
 *
 * Phase 0 is intentionally a no-op. The `electron-updater` package is
 * installed and listed in `dependencies`, but we don't wire a publish
 * feed or check-for-updates handler until Phase 1, when we have a real
 * release pipeline (signed builds, GitHub Releases as the feed, etc.).
 *
 * Keeping the function exported means the main entry can call it once
 * during `app.whenReady()` and Phase 1 can replace the body without
 * touching the call site.
 */

import { APP_NAME, APP_VERSION, isDev } from './config'

export interface AutoUpdaterStatus {
  enabled: boolean
  reason: string
  appName: string
  appVersion: string
}

let initialised = false

/**
 * Initialise the auto-updater. In Phase 0 this only logs the disabled
 * state; Phase 1 will hook `electron-updater` into a GitHub Releases
 * feed and surface install progress to the user.
 */
export function initAutoUpdater(): AutoUpdaterStatus {
  if (initialised) {
    return {
      enabled: false,
      reason: 'already-initialised',
      appName: APP_NAME,
      appVersion: APP_VERSION,
    }
  }
  initialised = true

  if (isDev) {
    console.log(`[updater] skipped in dev mode (${APP_NAME}@${APP_VERSION})`)
    return {
      enabled: false,
      reason: 'dev-mode',
      appName: APP_NAME,
      appVersion: APP_VERSION,
    }
  }

  console.log(
    `[updater] Phase 0 placeholder — install/upgrade flow ships in Phase 1 (${APP_NAME}@${APP_VERSION})`,
  )
  return {
    enabled: false,
    reason: 'phase-0-placeholder',
    appName: APP_NAME,
    appVersion: APP_VERSION,
  }
}
