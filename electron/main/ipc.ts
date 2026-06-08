/**
 * IPC bridge between the renderer and the main process.
 *
 * Every privileged operation the renderer needs (open a file dialog,
 * reveal a file in Finder, show a notification, etc.) is registered
 * here as an `ipcMain.handle` call. The renderer accesses it through
 * the preload's `window.api` surface — never through `require` or
 * `ipcRenderer` directly.
 *
 * Phase 0 only wires the surface area. Real implementations (file
 * persistence, native notifications, tray, etc.) land in Phase 1.
 */

import { BrowserWindow, Notification, dialog, ipcMain, shell } from 'electron'
import {
  IpcEventChannel,
  IpcInvokeChannel,
  type AppInfoPayload,
  type LogPayload,
  type NotifyPayload,
  type OpenExternalPayload,
  type PlatformInfoPayload,
  type ShowItemInFolderPayload,
  type ShowMessageBoxPayload,
  type ShowMessageBoxResponse,
  type ShowOpenDialogPayload,
  type ShowOpenDialogResponse,
  type ShowSaveDialogPayload,
  type ShowSaveDialogResponse,
} from '../shared/types'
import { APP_ID, APP_NAME, APP_VERSION, isDev } from './config'

/* -------------------------------------------------------------------------- */
/*                              Helpers                                        */
/* -------------------------------------------------------------------------- */

function focusedWindow(): BrowserWindow | null {
  return (
    BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
  )
}

/** Defensive log helper — keeps the renderer log stream in main-process stdout. */
function forwardLog(payload: LogPayload): void {
  const ctx = payload.context ? ` ${JSON.stringify(payload.context)}` : ''
  const msg = `[renderer:${payload.level}] ${payload.message}${ctx}`
  switch (payload.level) {
    case 'error':
      console.error(msg)
      break
    case 'warn':
      console.warn(msg)
      break
    case 'debug':
      console.debug(msg)
      break
    default:
      console.log(msg)
  }
}

/* -------------------------------------------------------------------------- */
/*                            Handler registration                             */
/* -------------------------------------------------------------------------- */

/**
 * Idempotent. Safe to call once during `app.whenReady()`. Calling it
 * twice would throw because `ipcMain.handle` rejects duplicate channel
 * names — guard accordingly.
 */
let registered = false

export function registerIpcHandlers(): void {
  if (registered) return
  registered = true

  // ----- App info ----------------------------------------------------------
  ipcMain.handle(IpcInvokeChannel.GetAppInfo, (): AppInfoPayload => ({
    name: APP_NAME,
    version: APP_VERSION,
    appId: APP_ID,
    isDev,
  }))

  ipcMain.handle(IpcInvokeChannel.GetPlatformInfo, (): PlatformInfoPayload => ({
    platform: process.platform,
    arch: process.arch,
    versions: {
      electron: process.versions.electron ?? 'unknown',
      chrome: process.versions.chrome ?? 'unknown',
      node: process.versions.node ?? 'unknown',
    },
  }))

  // ----- Shell helpers -----------------------------------------------------
  ipcMain.handle(
    IpcInvokeChannel.OpenExternal,
    async (_event, payload: OpenExternalPayload): Promise<void> => {
      if (typeof payload?.url !== 'string' || payload.url.length === 0) {
        throw new Error('openExternal: url must be a non-empty string')
      }
      // Defensive: only allow http(s) — refuse file://, javascript:, etc.
      if (!/^https?:\/\//i.test(payload.url)) {
        throw new Error(`openExternal: refusing non-http(s) url "${payload.url}"`)
      }
      await shell.openExternal(payload.url)
    },
  )

  ipcMain.handle(
    IpcInvokeChannel.ShowItemInFolder,
    async (_event, payload: ShowItemInFolderPayload): Promise<void> => {
      if (typeof payload?.path !== 'string' || payload.path.length === 0) {
        throw new Error('showItemInFolder: path must be a non-empty string')
      }
      shell.showItemInFolder(payload.path)
    },
  )

  // ----- Dialogs -----------------------------------------------------------
  ipcMain.handle(
    IpcInvokeChannel.ShowOpenDialog,
    async (_event, payload: ShowOpenDialogPayload): Promise<ShowOpenDialogResponse> => {
      const win = focusedWindow()
      return dialog.showOpenDialog(win ?? new BrowserWindow({ show: false }), payload.options)
    },
  )

  ipcMain.handle(
    IpcInvokeChannel.ShowSaveDialog,
    async (_event, payload: ShowSaveDialogPayload): Promise<ShowSaveDialogResponse> => {
      const win = focusedWindow()
      return dialog.showSaveDialog(win ?? new BrowserWindow({ show: false }), payload.options)
    },
  )

  ipcMain.handle(
    IpcInvokeChannel.ShowMessageBox,
    async (_event, payload: ShowMessageBoxPayload): Promise<ShowMessageBoxResponse> => {
      const win = focusedWindow()
      return dialog.showMessageBox(win ?? new BrowserWindow({ show: false }), payload.options)
    },
  )

  // ----- Push channels (main → renderer) -----------------------------------
  // No `ipcMain.handle` here; these are send-side. The preload subscribes
  // via `ipcRenderer.on`. We expose a thin API by attaching the helper to
  // the main process for the menu / updater to call.

  // ----- Renderer log forwarding -------------------------------------------
  ipcMain.on(IpcEventChannel.Log, (_event, payload: LogPayload) => {
    if (payload && typeof payload.message === 'string') {
      forwardLog(payload)
    }
  })

  // ----- Notifications (Phase 0: best-effort) ------------------------------
  // `Notification` is unavailable in some sandbox configurations; we wrap
  // it in a try/catch so the renderer call always resolves.
  ipcMain.on(IpcEventChannel.Notify, (_event, payload: NotifyPayload) => {
    if (!payload?.options) return
    try {
      if (Notification.isSupported()) {
        const n = new Notification(payload.options)
        n.show()
      } else {
        console.warn('[main] Native notifications not supported on this platform')
      }
    } catch (err) {
      console.error('[main] Failed to show notification', err)
    }
  })
}
