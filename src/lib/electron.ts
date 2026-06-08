/**
 * Runtime helpers for the renderer to detect whether it is running
 * inside Electron, and to consume the `window.api` surface safely.
 *
 * Web build (vite dev / vite preview / static hosting):
 *   - `window.api` is undefined → `isElectron` is `false`
 *
 * Desktop build (electron-vite dev / packaged Electron):
 *   - Preload exposed `window.api` via contextBridge
 *   - `isElectron` is `true`
 *
 * Always narrow with the helpers in this module before calling any
 * `window.api.*` method, otherwise TypeScript will reject the access
 * (because `window.api` is `undefined` in the web build).
 */

import type { ElectronAPI } from '../types/electron'

/**
 * Synchronous guard for "are we running under Electron at all?". Safe
 * to use in render code, hooks, and module init — it does not touch
 * any Node API.
 */
export const isElectron: boolean =
  typeof window !== 'undefined' && typeof window.api !== 'undefined'

/**
 * Return the ElectronAPI surface, or `null` when running outside
 * Electron. Use this when you need a non-null handle to call methods
 * (the returned value is typed as `ElectronAPI`).
 *
 * ```ts
 * const api = getElectronAPI()
 * if (api) {
 *   await api.openExternal('https://example.com')
 * }
 * ```
 */
export function getElectronAPI(): ElectronAPI | null {
  return window.api ?? null
}

/**
 * True when the host OS is macOS. Useful for keyboard-shortcut hints
 * and platform-specific UI affordances.
 */
export const isMacOS: boolean = (() => {
  if (isElectron) {
    const api = window.api
    if (api?.platform) {
      return api.platform === 'darwin'
    }
  }
  // Fallback: best-effort detection from the browser.
  if (typeof navigator === 'undefined') return false
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData
  const platform = uaData?.platform ?? navigator.platform ?? ''
  return platform.toLowerCase().includes('mac')
})()
