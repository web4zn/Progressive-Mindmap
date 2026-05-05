import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FileText, Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'

interface ContextMenuProps {
  x: number
  y: number
  nodeId: string
  canMoveUp: boolean
  canMoveDown: boolean
  confirmDelete: boolean
  onEdit: () => void
  onAddChild: () => void
  onMoveUp: () => void
  onMoveDown: () => void
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
  confirmDelete,
  onEdit,
  onAddChild,
  onMoveUp,
  onMoveDown,
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
      className="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[160px]"
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
          >
            <FileText className="w-3.5 h-3.5" />
            编辑
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
            onClick={onAddChild}
          >
            <Plus className="w-3.5 h-3.5" />
            添加子节点
          </button>
          <div className="border-t border-border my-1" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-30"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            上移
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-30"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            下移
          </button>
          <div className="border-t border-border my-1" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-accent flex items-center gap-2"
            onClick={onDeleteRequest}
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
