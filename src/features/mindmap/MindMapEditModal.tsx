import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import type { MindMapNode } from '@/types/mindmap'

interface MindMapEditModalProps {
  node: MindMapNode
  onConfirm: (nodeId: string, label: string, summary: string) => void
  onCancel: () => void
}

export default function MindMapEditModal({ node, onConfirm, onCancel }: MindMapEditModalProps) {
  const [label, setLabel] = useState(node.label)
  const [summary, setSummary] = useState(node.summary)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleConfirm = () => {
    if (label.trim()) {
      onConfirm(node.id, label.trim(), summary.trim())
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-popover border border-border rounded-lg shadow-xl p-5 w-[360px] space-y-4">
        <h3 className="text-sm font-semibold">编辑节点</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">名称</label>
            <input
              ref={inputRef}
              className="w-full text-sm font-medium bg-background border border-input rounded px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleConfirm()
                } else if (e.key === 'Escape') {
                  onCancel()
                }
              }}
              placeholder="节点名称"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">摘要（可选）</label>
            <textarea
              className="w-full text-sm bg-background border border-input rounded px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCancel()
              }}
              placeholder="摘要内容"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onCancel}>取消</Button>
          <Button size="sm" onClick={handleConfirm}>确认</Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
