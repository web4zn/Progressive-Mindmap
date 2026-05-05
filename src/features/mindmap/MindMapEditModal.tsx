import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import type { MindMapNode } from '@/types/mindmap'

interface MindMapEditModalProps {
  node: MindMapNode
  onConfirm: (
    nodeId: string,
    label: string,
    summary: string,
    content?: string,
    contentType?: 'text' | 'markdown',
  ) => void
  onCancel: () => void
}

export default function MindMapEditModal({ node, onConfirm, onCancel }: MindMapEditModalProps) {
  const [label, setLabel] = useState(node.label)
  const [summary, setSummary] = useState(node.summary)
  const [content, setContent] = useState(node.content ?? '')
  const [contentType, setContentType] = useState<'text' | 'markdown'>(
    node.contentType === 'markdown' ? 'markdown' : 'text',
  )
  const [previewing, setPreviewing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleConfirm = () => {
    if (label.trim()) {
      onConfirm(
        node.id,
        label.trim(),
        summary.trim(),
        contentType === 'markdown' ? content.trim() : undefined,
        contentType,
      )
    }
  }

  const isMarkdown = contentType === 'markdown'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-popover border border-border rounded-lg shadow-xl p-5 w-[420px] max-h-[85vh] overflow-y-auto space-y-4">
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
                if (e.key === 'Escape' && !e.shiftKey) onCancel()
              }}
              placeholder="摘要内容"
              rows={2}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground block">
                内容类型
              </label>
              <div className="flex gap-1">
                <Button
                  variant={contentType === 'text' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => setContentType('text')}
                >
                  纯文本
                </Button>
                <Button
                  variant={contentType === 'markdown' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => setContentType('markdown')}
                >
                  Markdown
                </Button>
              </div>
            </div>
            {isMarkdown && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    Markdown 内容（可选）
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() => setPreviewing(!previewing)}
                  >
                    {previewing ? '编辑' : '预览'}
                  </Button>
                </div>
                {previewing ? (
                  <div className="w-full min-h-[60px] max-h-[200px] overflow-y-auto border border-input rounded px-3 py-2 text-xs prose prose-sm dark:prose-invert max-w-none prose-code:text-[11px] prose-pre:bg-muted prose-pre:text-[11px] prose-table:text-[11px]">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {content || '_无内容_'}
                    </Markdown>
                  </div>
                ) : (
                  <textarea
                    className="w-full text-sm bg-background border border-input rounded px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono text-xs"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && !e.shiftKey) {
                        if (previewing) {
                          setPreviewing(false)
                        } else {
                          onCancel()
                        }
                      }
                    }}
                    placeholder={`**bold** *italic* \`code\` ~~strike~~

\`\`\`python
print("code block")
\`\`\`

| A | B |
|---|---|
| 1 | 2 |`}
                    rows={6}
                  />
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            确认
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
