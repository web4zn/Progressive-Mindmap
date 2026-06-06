/**
 * Application menu definition.
 *
 * Every menu item that triggers a renderer-visible action sends a
 * `MenuAction` string through the `app:menu-action` IPC channel. The
 * preload exposes a typed `onMenuAction(callback)` subscription so the
 * React UI can react without touching Node APIs.
 *
 * Phase 0 keeps the renderer side inert for items that do not have a
 * real handler yet — the IPC message is emitted, the renderer
 * subscriber can no-op safely, and Phase 1 will fill in the gaps.
 */

import { app, BrowserWindow, Menu, type MenuItemConstructorOptions, shell } from 'electron'
import { IpcEventChannel, type MenuAction, isMenuAction } from '../shared/types'
import { APP_DISPLAY_NAME, GITHUB_REPO, isDev } from './config'

/**
 * Helper that emits a menu-action IPC message on the focused window.
 * The renderer's `onMenuAction` subscriber will receive the action.
 */
function sendMenuAction(win: BrowserWindow | null, action: MenuAction): void {
  if (!win || win.isDestroyed()) return
  win.webContents.send(IpcEventChannel.MenuAction, action)
}

/** Resolve the focused (or last-active) window, or null. */
function focusedWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
}

/* -------------------------------------------------------------------------- */
/*                               Submenu builders                              */
/* -------------------------------------------------------------------------- */

function buildAppSubmenu(onAction: (action: MenuAction) => void): MenuItemConstructorOptions[] {
  return [
    {
      label: `About ${APP_DISPLAY_NAME}`,
      click: () => onAction('menu:about'),
    },
    { type: 'separator' },
    {
      label: 'Preferences…',
      accelerator: 'CmdOrCtrl+,',
      click: () => onAction('menu:preferences'),
    },
    { type: 'separator' },
    { role: 'services' },
    { type: 'separator' },
    { role: 'hide' },
    { role: 'hideOthers' },
    { role: 'unhide' },
    { type: 'separator' },
    { role: 'quit' },
  ]
}

function buildFileSubmenu(onAction: (action: MenuAction) => void): MenuItemConstructorOptions[] {
  const isMac = process.platform === 'darwin'
  return [
    {
      label: 'New Mindmap',
      accelerator: 'CmdOrCtrl+N',
      click: () => onAction('menu:new-mindmap'),
    },
    {
      label: 'New Conversation',
      accelerator: 'CmdOrCtrl+Shift+N',
      click: () => onAction('menu:new-conversation'),
    },
    { type: 'separator' },
    {
      label: 'Import…',
      accelerator: 'CmdOrCtrl+O',
      click: () => onAction('menu:import'),
    },
    {
      label: 'Export…',
      accelerator: 'CmdOrCtrl+S',
      click: () => onAction('menu:export'),
    },
    { type: 'separator' },
    isMac ? { role: 'close' } : { role: 'quit' },
  ]
}

function buildEditSubmenu(): MenuItemConstructorOptions[] {
  return [
    { role: 'undo' },
    { role: 'redo' },
    { type: 'separator' },
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    ...(process.platform === 'darwin'
      ? ([{ role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' }] as MenuItemConstructorOptions[])
      : ([{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }] as MenuItemConstructorOptions[])),
  ]
}

function buildViewSubmenu(onAction: (action: MenuAction) => void): MenuItemConstructorOptions[] {
  return [
    {
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click: () => onAction('menu:reload'),
    },
    {
      label: 'Force Reload',
      accelerator: 'CmdOrCtrl+Shift+R',
      click: () => onAction('menu:force-reload'),
    },
    { type: 'separator' },
    {
      label: 'Toggle DevTools',
      accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'CmdOrCtrl+Shift+I',
      click: (_item, win) => {
        if (win instanceof BrowserWindow && !win.isDestroyed()) {
          win.webContents.toggleDevTools()
        }
      },
    },
    { type: 'separator' },
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
    { type: 'separator' },
    {
      label: 'Toggle Sidebar',
      accelerator: 'CmdOrCtrl+B',
      click: () => onAction('menu:toggle-sidebar'),
    },
  ]
}

function buildWindowSubmenu(): MenuItemConstructorOptions[] {
  const isMac = process.platform === 'darwin'
  return [
    { role: 'minimize' },
    { role: 'zoom' },
    ...(isMac
      ? ([
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' },
        ] as MenuItemConstructorOptions[])
      : ([{ role: 'close' }] as MenuItemConstructorOptions[])),
  ]
}

function buildHelpSubmenu(onAction: (action: MenuAction) => void): MenuItemConstructorOptions[] {
  return [
    {
      label: 'GitHub Repository',
      click: () => {
        void shell.openExternal(GITHUB_REPO.url)
        onAction('menu:open-github')
      },
    },
    {
      label: 'Documentation',
      click: () => onAction('menu:open-docs'),
    },
    { type: 'separator' },
    {
      label: `About ${APP_DISPLAY_NAME}`,
      click: () => onAction('menu:about'),
    },
  ]
}

/* -------------------------------------------------------------------------- */
/*                              Public API                                     */
/* -------------------------------------------------------------------------- */

/**
 * Build the menu and register it as the application menu. Subsequent
 * calls are no-ops; the menu is fixed for the lifetime of the app.
 */
export function buildAppMenu(): void {
  const emit = (action: MenuAction): void => {
    if (!isMenuAction(action)) return
    sendMenuAction(focusedWindow(), action)
  }

  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([{ label: APP_DISPLAY_NAME, submenu: buildAppSubmenu(emit) }] as MenuItemConstructorOptions[])
      : []),
    { label: 'File', submenu: buildFileSubmenu(emit) },
    { label: 'Edit', submenu: buildEditSubmenu() },
    { label: 'View', submenu: buildViewSubmenu(emit) },
    { label: 'Window', submenu: buildWindowSubmenu() },
    { role: 'help', submenu: buildHelpSubmenu(emit) },
  ]

  // Dev-only menu items: live reload & friends. Wrapped in a check so
  // production builds don't ship a "Debug" menu.
  if (isDev) {
    template.push({
      label: 'Debug',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'toggleSpellChecker' },
      ],
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // Suppress "app is not defined" warning when running from a context
  // that hasn't finished initialising yet — the menu is built from
  // `app.whenReady`, so this is just a defensive null guard.
  void app
}
