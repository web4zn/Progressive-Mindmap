/**
 * Global `Window.api` augmentation for the Electron preload bridge.
 *
 * The preload script (executed before the React app boots) installs
 * `window.api` via `contextBridge.exposeInMainWorld`. In the web build
 * there is no preload, so `window.api` is intentionally undefined.
 *
 * This file only declares the type — it does not emit any runtime
 * code, so it is safe to include in every compilation unit.
 *
 * The shape mirrors `electron/preload/api.d.ts`; the shared `MenuAction`
 * union and payload types live in `electron/shared/types.ts` and are
 * re-declared here so the renderer never needs to cross the
 * `electron/` boundary at type-check time.
 */

import type {
  MessageBoxOptions,
  MessageBoxReturnValue,
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue,
} from 'electron'

/* -------------------------------------------------------------------------- */
/*                          Renderer-side type mirror                         */
/* -------------------------------------------------------------------------- */

export interface AppInfoPayload {
  name: string
  version: string
  appId: string
  isDev: boolean
}

export interface PlatformInfoPayload {
  platform: NodeJS.Platform
  arch: string
  versions: {
    electron: string
    chrome: string
    node: string
  }
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogPayload {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
}

/**
 * Closed union of every menu action the main process can dispatch.
 * Keep in sync with `electron/shared/types.ts`.
 */
export type MenuAction =
  | 'menu:new-mindmap'
  | 'menu:new-conversation'
  | 'menu:import'
  | 'menu:export'
  | 'menu:close-window'
  | 'menu:quit'
  | 'menu:reload'
  | 'menu:force-reload'
  | 'menu:toggle-devtools'
  | 'menu:toggle-fullscreen'
  | 'menu:reset-zoom'
  | 'menu:toggle-sidebar'
  | 'menu:open-github'
  | 'menu:open-docs'
  | 'menu:about'
  | 'menu:preferences'

export interface ElectronAPI {
  readonly platform: NodeJS.Platform
  getAppInfo(): Promise<AppInfoPayload>
  getPlatformInfo(): Promise<PlatformInfoPayload>
  openExternal(url: string): Promise<void>
  showItemInFolder(path: string): Promise<void>
  showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue>
  showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogReturnValue>
  showMessageBox(options: MessageBoxOptions): Promise<MessageBoxReturnValue>
  notify(options: { title: string; body?: string }): void
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void
  onMenuAction(callback: (action: MenuAction) => void): () => void
}

declare global {
  interface Window {
    api?: ElectronAPI
  }
}
