/**
 * Type definitions for the `window.api` surface exposed by the preload.
 *
 * This file is for the preload bundle itself — it lets the preload
 * reference its own surface without circular imports. The renderer
 * consumes the same surface through `src/types/electron.d.ts`, which
 * augments the global `Window` interface.
 *
 * Keep this file in sync with `electron/preload/index.ts`.
 */

import type {
  MessageBoxOptions,
  MessageBoxReturnValue,
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue,
} from 'electron'
import type { AppInfoPayload, LogPayload, MenuAction, PlatformInfoPayload } from '../shared/types'

export interface ElectronAPI {
  /** Operating system of the host. */
  readonly platform: NodeJS.Platform

  /** Read-only app metadata. */
  getAppInfo(): Promise<AppInfoPayload>
  getPlatformInfo(): Promise<PlatformInfoPayload>

  /** Open an http(s) URL in the system browser. */
  openExternal(url: string): Promise<void>

  /** Reveal a file path in the OS file manager. */
  showItemInFolder(path: string): Promise<void>

  /** Native dialogs. */
  showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue>
  showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogReturnValue>
  showMessageBox(options: MessageBoxOptions): Promise<MessageBoxReturnValue>

  /** Best-effort native notification. */
  notify(options: { title: string; body?: string }): void

  /** Forward a log line to the main process console. */
  log(level: LogPayload['level'], message: string, context?: Record<string, unknown>): void

  /** Subscribe to menu actions. Returns an unsubscribe function. */
  onMenuAction(callback: (action: MenuAction) => void): () => void
}
