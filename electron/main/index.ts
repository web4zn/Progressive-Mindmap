/**
 * Electron main process entry.
 *
 * Phase 0 responsibilities:
 *  - Acquire a single-instance lock (focus existing window on second launch).
 *  - Create the primary BrowserWindow with the secure web preferences
 *    mandated by the desktop-shell spec.
 *  - Load the Vite dev server in dev, or the bundled renderer in prod.
 *  - Wire up the application menu and IPC channels.
 *  - Stay alive on macOS after the last window closes.
 *
 * Renderer-privileged code lives in preload; this file never touches the
 * DOM or any Node API that would be unsafe in a web context.
 *
 * The project declares `"type": "module"` in package.json, so this
 * module is loaded as ESM by Node. Use `import.meta.dirname` instead
 * of the CommonJS `__dirname` global.
 */

import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { initAutoUpdater } from './updater'
import { registerIpcHandlers } from './ipc'
import { buildAppMenu } from './menu'
import {
  APP_DISPLAY_NAME,
  APP_ID,
  APP_NAME,
  DEV_SERVER_URL,
  PRELOAD_BUNDLE,
  PROD_RENDERER_INDEX,
  isDev,
} from './config'

const mainDir = import.meta.dirname

/* -------------------------------------------------------------------------- */
/*                            Single-instance lock                             */
/* -------------------------------------------------------------------------- */

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  // A previous instance is already running. Quit immediately so the
  // existing window can be focused via the `second-instance` event below.
  app.quit()
  process.exit(0)
}

let mainWindow: BrowserWindow | null = null

app.on('second-instance', () => {
  // The user tried to launch a second copy. Focus the existing window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
  }
})

/* -------------------------------------------------------------------------- */
/*                              Window creation                                */
/* -------------------------------------------------------------------------- */

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: APP_DISPLAY_NAME,
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(mainDir, PRELOAD_BUNDLE),
      // Hard security baseline. Renderer has no Node access; all
      // privileged operations must go through the preload bridge.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  })

  win.on('ready-to-show', () => {
    win.show()
    if (isDev) {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Block any attempt by the renderer to navigate to an external URL.
  // External links must be opened via `shell.openExternal` from the
  // main process (the preload exposes `openExternal` for this).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(DEV_SERVER_URL)) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null
    }
  })

  // Load the renderer: Vite dev server in dev, bundled HTML in prod.
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(mainDir, PROD_RENDERER_INDEX))
  }

  return win
}

/* -------------------------------------------------------------------------- */
/*                              App lifecycle                                  */
/* -------------------------------------------------------------------------- */

app.setName(APP_NAME)
app.setAppUserModelId(APP_ID)

app.whenReady().then(() => {
  registerIpcHandlers()
  buildAppMenu()

  mainWindow = createMainWindow()

  // Phase 0 updater is a no-op; Phase 1 will wire in real auto-update.
  initAutoUpdater()

  app.on('activate', () => {
    // macOS: re-create a window when the dock icon is clicked and no
    // other windows are open.
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // macOS apps usually stay alive after all windows close. Other
  // platforms quit when the last window closes.
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/* -------------------------------------------------------------------------- */
/*                             Hardening / extras                              */
/* -------------------------------------------------------------------------- */

// Defence-in-depth: any window the renderer tries to spawn must go
// through the OS browser, never in-app.
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })
})
