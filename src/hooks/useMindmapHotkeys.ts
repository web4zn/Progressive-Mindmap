import { useEffect } from 'react'

/**
 * Stage A2 + Stage C — global keyboard shortcuts for the mindmap canvas.
 *
 * Designed to be installed exactly once per MindMapTree mount. The hook
 * owns the keydown listener and dispatches to the callbacks the parent
 * supplies. Hotkeys are intentionally skipped when focus is inside an
 * editable element (input / textarea / contentEditable) so editing
 * labels / summaries / modal fields doesn't trigger canvas actions.
 *
 * Keymap (case-insensitive):
 *   F                         focus the selected node
 *   R                         auto-arrange (re-fit to initial layout)
 *   + / =                     zoom in
 *   - / _                     zoom out
 *   Delete / Backspace        delete the selected node
 *   Tab                       add a child to the selected node
 *   Shift+Tab                 jump to parent of the selected node
 *   Escape                    cancel current selection / close overlay
 *   Cmd/Ctrl + Z              undo
 *   Cmd/Ctrl + Shift + Z      redo
 *   ↑ / ↓ / ← / →             jump to nearest / sibling node
 *   Shift+F10 / ContextMenu   open the context menu on the selected node
 *
 * React Flow's own `Delete` shortcut is disabled by setting
 * `deleteKeyCode={null}` on the `<ReactFlow>` instance, so this hook is
 * the single source of truth for that binding.
 *
 * The hook does NOT call `event.preventDefault()` unless it's a Tab
 * (which we need to suppress so React Flow doesn't shift focus) or
 * an arrow key with a selected node (so the browser doesn't scroll).
 */

export interface MindmapHotkeyHandlers {
  onFocusSelected: (nodeId: string) => void
  onAutoArrange: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onDeleteSelected: (nodeId: string) => void
  onAddChild: (nodeId: string) => void
  /** Stage C: open the context menu for a node (Shift+F10 / ContextMenu key). */
  onOpenContextMenu: (nodeId: string) => void
  /** Stage C: arrow-key navigation. `direction` is the bare direction
   *  (one of 'up' / 'down' / 'left' / 'right') so the parent can apply
   *  the tree-based OR position-based algorithm depending on whether
   *  the layout is dagre-LR or freeform. */
  onArrowNavigate: (currentId: string, direction: 'up' | 'down' | 'left' | 'right') => void
  /** Stage C: Tab/Shift+Tab jump — child / parent. */
  onTabJump: (currentId: string, shift: boolean) => void
  onCancel: () => void
  onUndo: () => void
  onRedo: () => void
}

export interface UseMindmapHotkeysOptions {
  handlers: MindmapHotkeyHandlers
  /** Currently selected node id. Hotkeys that need a target (F, Tab,
   *  Delete, arrows, context menu) become no-ops when this is null. */
  selectedNodeId: string | null
  /** When false the listener is not installed. Useful while a modal is
   *  open. Defaults to true. */
  enabled?: boolean
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

export function useMindmapHotkeys(options: UseMindmapHotkeysOptions): void {
  const { handlers, selectedNodeId, enabled = true } = options

  useEffect(() => {
    if (!enabled) return
    const h = handlers

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      const key = event.key
      const lowerKey = key.length === 1 ? key.toLowerCase() : key
      const mod = event.metaKey || event.ctrlKey
      const shift = event.shiftKey

      // Modifier-based undo/redo must come BEFORE the single-key dispatch
      // because they share the 'z' letter.
      if (mod && (lowerKey === 'z' || key === 'Z')) {
        event.preventDefault()
        if (shift) {
          h.onRedo()
        } else {
          h.onUndo()
        }
        return
      }

      // The rest of the bindings are no-modifier hotkeys. Reject anything
      // that comes with a modifier so we don't shadow browser shortcuts
      // (Cmd+R for reload, Cmd+= for zoom, etc.).
      if (mod) return

      // ContextMenu key (Menu key on Windows) — the user expects
      // `onOpenContextMenu` even though `key` is `'ContextMenu'`.
      if (key === 'ContextMenu') {
        if (selectedNodeId) {
          event.preventDefault()
          h.onOpenContextMenu(selectedNodeId)
        }
        return
      }

      // Shift+F10 — same as ContextMenu key. Matches Windows / LibreOffice
      // / VS Code conventions.
      if (shift && key === 'F10') {
        if (selectedNodeId) {
          event.preventDefault()
          h.onOpenContextMenu(selectedNodeId)
        }
        return
      }

      switch (lowerKey) {
        case 'f':
          if (selectedNodeId) {
            event.preventDefault()
            h.onFocusSelected(selectedNodeId)
          }
          return
        case 'r':
          event.preventDefault()
          h.onAutoArrange()
          return
        case '+':
        case '=':
          event.preventDefault()
          h.onZoomIn()
          return
        case '-':
        case '_':
          event.preventDefault()
          h.onZoomOut()
          return
        case 'Delete':
        case 'Backspace':
          if (selectedNodeId) {
            event.preventDefault()
            h.onDeleteSelected(selectedNodeId)
          }
          return
        case 'Tab':
          if (selectedNodeId) {
            event.preventDefault()
            h.onTabJump(selectedNodeId, shift)
          }
          return
        case 'ArrowUp':
          if (selectedNodeId) {
            event.preventDefault()
            h.onArrowNavigate(selectedNodeId, 'up')
          }
          return
        case 'ArrowDown':
          if (selectedNodeId) {
            event.preventDefault()
            h.onArrowNavigate(selectedNodeId, 'down')
          }
          return
        case 'ArrowLeft':
          if (selectedNodeId) {
            event.preventDefault()
            h.onArrowNavigate(selectedNodeId, 'left')
          }
          return
        case 'ArrowRight':
          if (selectedNodeId) {
            event.preventDefault()
            h.onArrowNavigate(selectedNodeId, 'right')
          }
          return
        case 'Escape':
          event.preventDefault()
          h.onCancel()
          return
        default:
          return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers, selectedNodeId, enabled])
}
