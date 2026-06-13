/**
 * MindMapContextMenu — node right-click menu.
 *
 * Keyboard-navigable (Enter / ArrowUp / ArrowDown / Escape) and
 * mouse-driven. Lists the actions available on a mindmap node:
 * edit, add child, center in viewport, duplicate, reset position
 * (only when the node has a pinned position), move up / down,
 * undo / redo, and delete (with confirm).
 *
 * The menu is rendered into `document.body` via `createPortal` so it
 * floats above the React Flow surface regardless of stacking
 * contexts.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FileText,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Crosshair,
  Undo2,
  Redo2,
  Copy,
  MapPin,
} from 'lucide-react'

interface ContextMenuProps {
  x: number
  y: number
  nodeId: string
  canMoveUp: boolean
  canMoveDown: boolean
  /** Stage A2: undo/redo are global timeline operations; the menu shows
   *  them as disabled when there is nothing to go back to. */
  canUndo: boolean
  canRedo: boolean
  confirmDelete: boolean
  /** True when the node carries a pinned `position` field that the
   *  user can reset. */
  hasPinnedPosition: boolean
  onEdit: () => void
  onAddChild: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  /** Stage A2: focus the clicked node in the viewport. */
  onCenter: () => void
  /** Stage A2: undo / redo actions wired to the same timeline as the
   *  keyboard shortcuts. */
  onUndo: () => void
  onRedo: () => void
  /** Drop the node's pinned position so dagre can re-place it. */
  onResetPosition: () => void
  /** Duplicate the node as a sibling. */
  onDuplicate: () => void
  onDeleteRequest: () => void
  onDeleteConfirm: () => void
  onCancelDelete: () => void
  onClose: () => void
}

const MENU_ORDER = [
  'edit',
  'addChild',
  'center',
  'duplicate',
  'resetPosition',
  'moveUp',
  'moveDown',
  'undo',
  'redo',
  'delete',
] as const

type MenuKey = (typeof MENU_ORDER)[number]

export default function MindMapContextMenu({
  x,
  y,
  nodeId,
  canMoveUp,
  canMoveDown,
  canUndo,
  canRedo,
  confirmDelete,
  hasPinnedPosition,
  onEdit,
  onAddChild,
  onMoveUp,
  onMoveDown,
  onCenter,
  onUndo,
  onRedo,
  onResetPosition,
  onDuplicate,
  onDeleteRequest,
  onDeleteConfirm,
  onCancelDelete,
  onClose,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [highlight, setHighlight] = useState<MenuKey>('edit')

  function trigger(key: MenuKey): void {
    switch (key) {
      case 'edit':
        onEdit()
        return
      case 'addChild':
        onAddChild()
        return
      case 'center':
        onCenter()
        return
      case 'duplicate':
        onDuplicate()
        return
      case 'resetPosition':
        onResetPosition()
        return
      case 'moveUp':
        if (canMoveUp) onMoveUp()
        return
      case 'moveDown':
        if (canMoveDown) onMoveDown()
        return
      case 'undo':
        if (canUndo) onUndo()
        return
      case 'redo':
        if (canRedo) onRedo()
        return
      case 'delete':
        onDeleteRequest()
        return
    }
  }

  // Click-outside dismisses the menu (mouse-only). Keyboard navigation
  // is handled in the keydown listener below.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [onClose])

  // Keyboard navigation. We re-render with the highlighted key first,
  // so the user sees the caret move before the action fires.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (confirmDelete) {
        if (event.key === 'Escape') {
          event.preventDefault()
          onCancelDelete()
        }
        return
      }
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          setHighlight((prev) => {
            const idx = MENU_ORDER.indexOf(prev)
            const nextIdx = idx === -1 ? 0 : Math.min(MENU_ORDER.length - 1, idx + 1)
            return MENU_ORDER[nextIdx] ?? 'edit'
          })
          return
        }
        case 'ArrowUp': {
          event.preventDefault()
          setHighlight((prev) => {
            const idx = MENU_ORDER.indexOf(prev)
            const nextIdx = idx <= 0 ? 0 : idx - 1
            return MENU_ORDER[nextIdx] ?? 'edit'
          })
          return
        }
        case 'Enter': {
          event.preventDefault()
          trigger(highlight)
          return
        }
        case 'Escape': {
          event.preventDefault()
          onClose()
          return
        }
        default:
          return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, confirmDelete])

  // Compute position so the menu doesn't overflow the right / bottom
  // edge of the viewport. We keep the original click position as the
  // anchor — the menu opens above-and-left of the cursor if the
  // cursor is in the bottom-right quadrant of the screen.
  const [menuW, setMenuW] = useState(220)
  const [menuH, setMenuH] = useState(320)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setMenuW(rect.width)
    setMenuH(rect.height)
  }, [confirmDelete])

  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = x + menuW + 8 > vw ? Math.max(8, x - menuW - 8) : x
  const top = y + menuH + 8 > vh ? Math.max(8, y - menuH - 8) : y

  function classFor(key: MenuKey, disabled = false): string {
    return [
      'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors',
      highlight === key ? 'bg-accent text-accent-foreground' : 'hover:bg-accent',
      disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
    ].join(' ')
  }

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="节点操作菜单"
      data-node-id={nodeId}
      data-testid="mindmap-context-menu"
      className="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[200px] mindmap-context-menu"
      style={{ left, top }}
    >
      {confirmDelete ? (
        <div className="mindmap-context-confirm" data-testid="mindmap-context-confirm">
          <div className="px-3 py-2 text-xs text-muted-foreground">确认删除此节点及其子节点？</div>
          <button
            autoFocus
            className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-accent"
            onClick={onDeleteConfirm}
            onMouseEnter={() => setHighlight('edit')}
          >
            确认删除
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
            onClick={onCancelDelete}
            onMouseEnter={() => setHighlight('addChild')}
          >
            取消
          </button>
        </div>
      ) : (
        <>
          <button
            role="menuitem"
            className={classFor('edit')}
            onClick={onEdit}
            onMouseEnter={() => setHighlight('edit')}
            title="编辑此节点（双击节点）"
          >
            <FileText className="w-3.5 h-3.5" />
            编辑
          </button>
          <button
            role="menuitem"
            className={classFor('addChild')}
            onClick={onAddChild}
            onMouseEnter={() => setHighlight('addChild')}
            title="添加子节点（Tab）"
          >
            <Plus className="w-3.5 h-3.5" />
            添加子节点
          </button>
          <button
            role="menuitem"
            className={classFor('center')}
            onClick={onCenter}
            onMouseEnter={() => setHighlight('center')}
            title="在画布居中（F）"
          >
            <Crosshair className="w-3.5 h-3.5" />
            在画布居中
          </button>
          <button
            role="menuitem"
            className={classFor('duplicate')}
            onClick={onDuplicate}
            onMouseEnter={() => setHighlight('duplicate')}
            title="复制为兄弟节点"
            data-testid="mindmap-context-duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
            复制节点
          </button>
          {hasPinnedPosition && (
            <button
              role="menuitem"
              className={classFor('resetPosition')}
              onClick={onResetPosition}
              onMouseEnter={() => setHighlight('resetPosition')}
              title="清除节点固定位置,让 dagre 重新排版"
              data-testid="mindmap-context-reset-position"
            >
              <MapPin className="w-3.5 h-3.5" />
              重置位置
            </button>
          )}
          <div className="border-t border-border my-1" />
          <button
            role="menuitem"
            className={classFor('moveUp', !canMoveUp)}
            disabled={!canMoveUp}
            onClick={onMoveUp}
            onMouseEnter={() => setHighlight('moveUp')}
            title="上移"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            上移
          </button>
          <button
            role="menuitem"
            className={classFor('moveDown', !canMoveDown)}
            disabled={!canMoveDown}
            onClick={onMoveDown}
            onMouseEnter={() => setHighlight('moveDown')}
            title="下移"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            下移
          </button>
          <div className="border-t border-border my-1" />
          <button
            role="menuitem"
            className={classFor('undo', !canUndo)}
            disabled={!canUndo}
            onClick={onUndo}
            onMouseEnter={() => setHighlight('undo')}
            title="撤销（Ctrl/⌘+Z）"
          >
            <Undo2 className="w-3.5 h-3.5" />
            撤销
          </button>
          <button
            role="menuitem"
            className={classFor('redo', !canRedo)}
            disabled={!canRedo}
            onClick={onRedo}
            onMouseEnter={() => setHighlight('redo')}
            title="重做（Ctrl/⌘+Shift+Z）"
          >
            <Redo2 className="w-3.5 h-3.5" />
            重做
          </button>
          <div className="border-t border-border my-1" />
          <button
            role="menuitem"
            className={classFor('delete').replace('hover:bg-accent', 'hover:bg-destructive/10')}
            onClick={onDeleteRequest}
            onMouseEnter={() => setHighlight('delete')}
            title="删除（Delete）"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
            <span className="text-destructive">删除</span>
          </button>
        </>
      )}
    </div>,
    document.body,
  )
}
