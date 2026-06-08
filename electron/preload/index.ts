/**
 * Preload bridge between the renderer and the main process.
 *
 * Exposes a frozen, typed object on `window.api` via
 * `contextBridge.exposeInMainWorld`. The renderer never has access to
 * `ipcRenderer` or `require` directly — every privileged call funnels
 * through this surface, so we can audit the boundary in one place.
 *
 * Phase 0 keeps the surface narrow:
 *  - Read-only metadata (platform, appVersion, appInfo, platformInfo)
 *  - Shell helpers (openExternal, showItemInFolder)
 *  - Native dialogs (open / save / message)
 *  - Notifications (best-effort)
 *  - Menu action subscription (returns unsubscribe)
 *  - Log forwarder
 *
 * Phase 1 will add file-system reads/writes, persistence migration,
 * tray controls, etc.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  MessageBoxOptions,
  MessageBoxReturnValue,
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue,
} from 'electron'
import {
  IpcEventChannel,
  IpcInvokeChannel,
  isMenuAction,
  type AppInfoPayload,
  type LogPayload,
  type MenuAction,
  type NotifyPayload,
  type OpenExternalPayload,
  type PlatformInfoPayload,
  type ShowItemInFolderPayload,
} from '../shared/types'

/* -------------------------------------------------------------------------- */
/*                              Internal helpers                               */
/* -------------------------------------------------------------------------- */

/**
 * Wrap an `ipcRenderer.on` subscription in a type-safe API. Returns
 * an unsubscribe function the renderer can call from a React effect
 * cleanup.
 */
function subscribe<T>(channel: string, listener: (value: T) => void): () => void {
  const wrapped = (_event: IpcRendererEvent, value: T): void => listener(value)
  ipcRenderer.on(channel, wrapped)
  return () => {
    ipcRenderer.removeListener(channel, wrapped)
  }
}

/* -------------------------------------------------------------------------- */
/*                              Public API surface                            */
/* -------------------------------------------------------------------------- */

const api = {
  /** Operating system of the host. */
  platform: process.platform,

  /** Read-only metadata. */
  getAppInfo: (): Promise<AppInfoPayload> =>
    ipcRenderer.invoke(IpcInvokeChannel.GetAppInfo) as Promise<AppInfoPayload>,

  getPlatformInfo: (): Promise<PlatformInfoPayload> =>
    ipcRenderer.invoke(IpcInvokeChannel.GetPlatformInfo) as Promise<PlatformInfoPayload>,

  /** Open a URL in the system browser. Only http(s) is allowed. */
  openExternal: (url: string): Promise<void> => {
    const payload: OpenExternalPayload = { url }
    return ipcRenderer.invoke(IpcInvokeChannel.OpenExternal, payload) as Promise<void>
  },

  /** Reveal a file path in the OS file manager. */
  showItemInFolder: (path: string): Promise<void> => {
    const payload: ShowItemInFolderPayload = { path }
    return ipcRenderer.invoke(IpcInvokeChannel.ShowItemInFolder, payload) as Promise<void>
  },

  /** Native open-file dialog. */
  showOpenDialog: (options: OpenDialogOptions): Promise<OpenDialogReturnValue> => {
    return ipcRenderer.invoke(IpcInvokeChannel.ShowOpenDialog, {
      options,
    }) as Promise<OpenDialogReturnValue>
  },

  /** Native save-file dialog. */
  showSaveDialog: (options: SaveDialogOptions): Promise<SaveDialogReturnValue> => {
    return ipcRenderer.invoke(IpcInvokeChannel.ShowSaveDialog, {
      options,
    }) as Promise<SaveDialogReturnValue>
  },

  /** Native message box. */
  showMessageBox: (options: MessageBoxOptions): Promise<MessageBoxReturnValue> => {
    return ipcRenderer.invoke(IpcInvokeChannel.ShowMessageBox, {
      options,
    }) as Promise<MessageBoxReturnValue>
  },

  /** Best-effort native notification. Phase 1 will refine the UX. */
  notify: (options: { title: string; body?: string }): void => {
    const payload: NotifyPayload = { options }
    ipcRenderer.send(IpcEventChannel.Notify, payload)
  },

  /** Forward a log line to the main process console. */
  log: (level: LogPayload['level'], message: string, context?: Record<string, unknown>): void => {
    const payload: LogPayload = { level, message, context }
    ipcRenderer.send(IpcEventChannel.Log, payload)
  },

  /**
   * Subscribe to menu-driven actions dispatched from the main process.
   * Returns an unsubscribe function — call it from React effect
   * cleanup to avoid leaks.
   */
  onMenuAction: (callback: (action: MenuAction) => void): (() => void) => {
    return subscribe<unknown>(IpcEventChannel.MenuAction, (raw) => {
      if (isMenuAction(raw)) {
        callback(raw)
      } else {
        // Defensive: drop unknown actions rather than crash the renderer.
        console.warn('[preload] received unknown menu action', raw)
      }
    })
  },
} as const

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
