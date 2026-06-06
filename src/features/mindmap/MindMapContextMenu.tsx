import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FileText, Plus, ArrowUp, ArrowDown, Trash2, Crosshair, Undo2, Redo2 } from 'lucide-react'

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
  onDeleteRequest: () => void
  onDeleteConfirm: () => void
  onCancelDelete: () => void
  onClose: () => void
}

export default function MindMapContextMenu({
  x,
  y,
  canMoveUp,
  canMoveDown,
  canUndo,
  canRedo,
  confirmDelete,
  onEdit,
  onAddChild,
  onMoveUp,
  onMoveDown,
  onCenter,
  onUndo,
  onRedo,
  onDeleteRequest,
  onDeleteConfirm,
  onCancelDelete,
  onClose,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[180px]"
      style={{ left: x, top: y }}
    >
      {confirmDelete ? (
        <>
          <div className="px-3 py-2 text-xs text-muted-foreground">确认删除此节点及其子节点？</div>
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-accent"
            onClick={onDeleteConfirm}
          >
            确认删除
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
            onClick={onCancelDelete}
          >
            取消
          </button>
        </>
      ) : (
        <>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
            onClick={onEdit}
            title="编辑此节点（双击节点）"
          >
            <FileText className="w-3.5 h-3.5" />
            编辑
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
            onClick={onAddChild}
            title="添加子节点（Tab）"
          >
            <Plus className="w-3.5 h-3.5" />
            添加子节点
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
            onClick={onCenter}
            title="在画布居中（F）"
          >
            <Crosshair className="w-3.5 h-3.5" />
            在画布居中
          </button>
          <div className="border-t border-border my-1" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-30"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            title="上移"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            上移
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-30"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            title="下移"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            下移
          </button>
          <div className="border-t border-border my-1" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-30"
            disabled={!canUndo}
            onClick={onUndo}
            title="撤销（Ctrl/⌘+Z）"
          >
            <Undo2 className="w-3.5 h-3.5" />
            撤销
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-30"
            disabled={!canRedo}
            onClick={onRedo}
            title="重做（Ctrl/⌘+Shift+Z）"
          >
            <Redo2 className="w-3.5 h-3.5" />
            重做
          </button>
          <div className="border-t border-border my-1" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-accent flex items-center gap-2"
            onClick={onDeleteRequest}
            title="删除（Delete）"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除
          </button>
        </>
      )}
    </div>,
    document.body,
  )
}
