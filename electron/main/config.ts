/**
 * Centralised build-time constants for the Electron main process.
 *
 * Imported by main / menu / ipc / updater. Keep this file free of
 * runtime side effects — it must remain a pure module so it can be
 * tree-shaken by Vite when bundling.
 */

import { app } from 'electron'
import packageJson from '../../package.json'

export const APP_NAME = packageJson.name
export const APP_DISPLAY_NAME =
  (packageJson as { productName?: string }).productName ?? packageJson.name
export const APP_VERSION = packageJson.version
export const APP_ID =
  (packageJson.build as { appId?: string } | undefined)?.appId ??
  'com.progressivemindmap.app'

/** True when Electron is running from `electron-vite dev` (or `npm run dev`). */
export const isDev = !app.isPackaged

/**
 * GitHub repository used for menu links (Help → GitHub, About dialog, etc.).
 * Parsed from package.json when present, otherwise falls back to defaults.
 */
const repoUrl = (packageJson.repository as { url?: string } | undefined)?.url
const match = repoUrl?.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)
export const GITHUB_REPO: { owner: string; repo: string; url: string } = {
  owner: match?.[1] ?? 'web4zn',
  repo: match?.[2] ?? 'progressive-mindmap',
  url: 'https://github.com/web4zn/progressive-mindmap',
}

export const DEV_SERVER_URL = 'http://localhost:5173'

/**
 * Path to the renderer entry in production, relative to the bundled main
 * script. electron-vite emits the main bundle at `out/main/index.js` and
 * the renderer build at `out/renderer/index.html`.
 */
export const PROD_RENDERER_INDEX = '../renderer/index.html'

/** Preload bundle path, relative to the bundled main script. */
export const PRELOAD_BUNDLE = '../preload/index.js'
