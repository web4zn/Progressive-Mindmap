/**
 * Shared types and constants for the Electron main + preload bridge.
 *
 * Phase 0 is intentionally narrow: channel names, payload shapes, and a
 * closed union of menu actions that the main process can send to the
 * renderer. Phase 1 will extend this with file-persistence and tray IPC.
 */

import type {
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue,
  MessageBoxOptions,
  MessageBoxReturnValue,
  NotificationConstructorOptions,
} from 'electron'

/* -------------------------------------------------------------------------- */
/*                              Channel constants                              */
/* -------------------------------------------------------------------------- */

/** Renderer → main (invoke / handle) channels. */
export const IpcInvokeChannel = {
  OpenExternal: 'app:open-external',
  ShowItemInFolder: 'app:show-item-in-folder',
  ShowOpenDialog: 'dialog:open',
  ShowSaveDialog: 'dialog:save',
  ShowMessageBox: 'dialog:message-box',
  GetAppInfo: 'app:get-info',
  GetPlatformInfo: 'app:get-platform',
} as const

export type IpcInvokeChannelName =
  (typeof IpcInvokeChannel)[keyof typeof IpcInvokeChannel]

/** Main → renderer (send / on) channels. */
export const IpcEventChannel = {
  Notify: 'app:notify',
  Log: 'app:log',
  MenuAction: 'app:menu-action',
} as const

export type IpcEventChannelName =
  (typeof IpcEventChannel)[keyof typeof IpcEventChannel]

/* -------------------------------------------------------------------------- */
/*                            IPC payload interfaces                            */
/* -------------------------------------------------------------------------- */

export interface OpenExternalPayload {
  url: string
}

export interface ShowItemInFolderPayload {
  path: string
}

export interface ShowOpenDialogPayload {
  options: OpenDialogOptions
}

export interface ShowSaveDialogPayload {
  options: SaveDialogOptions
}

export interface ShowMessageBoxPayload {
  options: MessageBoxOptions
}

export interface NotifyPayload {
  options: NotificationConstructorOptions
}

export interface LogPayload {
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  context?: Record<string, unknown>
}

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

export type ShowOpenDialogResponse = OpenDialogReturnValue
export type ShowSaveDialogResponse = SaveDialogReturnValue
export type ShowMessageBoxResponse = MessageBoxReturnValue

/* -------------------------------------------------------------------------- */
/*                               Menu action union                              */
/* -------------------------------------------------------------------------- */

/**
 * Every menu-driven action the main process can dispatch to the renderer.
 * Renderer subscribes via `window.api.onMenuAction(callback)`.
 *
 * Naming convention: `menu:<verb>` (kebab-case inside the verb, e.g.
 * `menu:toggle-sidebar`). Keep this list in sync with `electron/main/menu.ts`.
 */
export type MenuAction =
  // File menu
  | 'menu:new-mindmap'
  | 'menu:new-conversation'
  | 'menu:import'
  | 'menu:export'
  | 'menu:close-window'
  | 'menu:quit'
  // Edit menu — handled natively, no IPC dispatch
  // View menu
  | 'menu:reload'
  | 'menu:force-reload'
  | 'menu:toggle-devtools'
  | 'menu:toggle-fullscreen'
  | 'menu:reset-zoom'
  | 'menu:toggle-sidebar'
  // Window menu — handled natively
  // Help menu
  | 'menu:open-github'
  | 'menu:open-docs'
  | 'menu:about'
  // macOS application menu
  | 'menu:preferences'

/* -------------------------------------------------------------------------- */
/*                              Public type guards                             */
/* -------------------------------------------------------------------------- */

export const ALL_MENU_ACTIONS: readonly MenuAction[] = [
  'menu:new-mindmap',
  'menu:new-conversation',
  'menu:import',
  'menu:export',
  'menu:close-window',
  'menu:quit',
  'menu:reload',
  'menu:force-reload',
  'menu:toggle-devtools',
  'menu:toggle-fullscreen',
  'menu:reset-zoom',
  'menu:toggle-sidebar',
  'menu:open-github',
  'menu:open-docs',
  'menu:about',
  'menu:preferences',
] as const

export function isMenuAction(value: unknown): value is MenuAction {
  return (
    typeof value === 'string' &&
    (ALL_MENU_ACTIONS as readonly string[]).includes(value)
  )
}
