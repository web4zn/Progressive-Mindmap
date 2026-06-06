import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Bold,
  Italic,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
  Quote,
  Columns2,
  Pencil,
  Eye,
} from 'lucide-react'
import { sanitizeHtml } from '@/lib/html-sanitizer'
import { Button } from '@/components/ui/button'
import type { MindMapNode } from '@/types/mindmap'

interface MindMapEditModalProps {
  node: MindMapNode
  onConfirm: (
    nodeId: string,
    label: string,
    summary: string,
    content?: string,
    contentType?: 'text' | 'html',
  ) => void
  onCancel: () => void
}

type HtmlViewMode = 'edit' | 'preview' | 'split'

interface ToolbarAction {
  id: string
  label: string
  icon: typeof Bold
  /** Insert a snippet at the current selection. If a `wrap` is provided,
   *  the action will wrap the current selection instead. */
  wrap?: { open: string; close: string; placeholder?: string }
  /** Insert a multi-line block. If `block` is provided, the action
   *  inserts a fresh block on its own lines and places the caret inside. */
  block?: { open: string; close: string; placeholder: string }
  /** Hint shown in the toolbar tooltip. */
  hint?: string
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { id: 'bold', label: '加粗', icon: Bold, wrap: { open: '<strong>', close: '</strong>', placeholder: '加粗文本' }, hint: '加粗（⌘B）' },
  { id: 'italic', label: '斜体', icon: Italic, wrap: { open: '<em>', close: '</em>', placeholder: '斜体文本' }, hint: '斜体（⌘I）' },
  { id: 'h3', label: 'H3', icon: Heading3, block: { open: '<h3>', close: '</h3>', placeholder: '小节标题' }, hint: '三级标题' },
  { id: 'h4', label: 'H4', icon: Heading4, block: { open: '<h4>', close: '</h4>', placeholder: '次级标题' }, hint: '四级标题' },
  { id: 'ul', label: '无序列表', icon: List, block: { open: '<ul>\n  <li>', close: '</li>\n</ul>', placeholder: '列表项' }, hint: '无序列表' },
  { id: 'ol', label: '有序列表', icon: ListOrdered, block: { open: '<ol>\n  <li>', close: '</li>\n</ol>', placeholder: '列表项' }, hint: '有序列表' },
  { id: 'code', label: '代码', icon: Code, wrap: { open: '<code>', close: '</code>', placeholder: 'code' }, hint: '行内代码' },
  { id: 'link', label: '链接', icon: LinkIcon, wrap: { open: '<a href="https://">', close: '</a>', placeholder: '链接文字' }, hint: '超链接' },
  { id: 'quote', label: '引用', icon: Quote, block: { open: '<blockquote>', close: '</blockquote>', placeholder: '引用内容' }, hint: '引用' },
]

export default function MindMapEditModal({ node, onConfirm, onCancel }: MindMapEditModalProps) {
  const [label, setLabel] = useState(node.label)
  const [summary, setSummary] = useState(node.summary)
  const [content, setContent] = useState(node.content ?? '')
  const [contentType, setContentType] = useState<'text' | 'html'>(
    node.contentType === 'html' ? 'html' : 'text',
  )
  const [viewMode, setViewMode] = useState<HtmlViewMode>('split')
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

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
        contentType === 'html' ? content.trim() : undefined,
        contentType,
      )
    }
  }

  const isHtml = contentType === 'html'

  const previewHtml = useMemo(
    () => (isHtml && content ? { __html: sanitizeHtml(content) } : undefined),
    [content, isHtml],
  )

  /**
   * Apply a toolbar action to the textarea at the current selection.
   * Centralised so the wrap / block semantics stay consistent.
   */
  const applyAction = useCallback(
    (action: ToolbarAction) => {
      const el = contentRef.current
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const selected = content.slice(start, end)
      const replacement = action.wrap
        ? `${action.wrap.open}${selected || action.wrap.placeholder || ''}${action.wrap.close}`
        : action.block
          ? `${action.block.open}${action.block.placeholder}${action.block.close}`
          : ''
      const next = content.slice(0, start) + replacement + content.slice(end)
      setContent(next)
      // Place the caret in the middle of the inserted snippet so the
      // user can keep typing. Use a microtask so React commits the new
      // value first.
      requestAnimationFrame(() => {
        el.focus()
        if (action.wrap) {
          const innerStart = start + action.wrap.open.length
          const innerEnd = innerStart + (selected.length || (action.wrap.placeholder?.length ?? 0))
          el.setSelectionRange(innerStart, innerEnd)
        } else if (action.block) {
          const innerStart = start + action.block.open.length
          const innerEnd = innerStart + action.block.placeholder.length
          el.setSelectionRange(innerStart, innerEnd)
        }
      })
    },
    [content],
  )

  // Stage A2: ⌘B / ⌘I shortcuts inside the HTML content textarea. We
  // deliberately do *not* re-use `useMindmapHotkeys` here — that hook is
  // for canvas-level shortcuts and is suppressed while the modal is
  // open. These handlers only fire when the textarea has focus.
  const handleContentKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault()
        applyAction(TOOLBAR_ACTIONS[0]!) // bold
      } else if (event.key === 'i' || event.key === 'I') {
        event.preventDefault()
        applyAction(TOOLBAR_ACTIONS[1]!) // italic
      } else if (event.key === 'Escape' && !event.shiftKey) {
        event.preventDefault()
        onCancel()
      }
    },
    [applyAction, onCancel],
  )

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-popover border border-border rounded-lg shadow-xl p-5 w-[760px] max-h-[88vh] overflow-y-auto space-y-4">
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
              <label className="text-xs text-muted-foreground block">内容类型</label>
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
                  variant={contentType === 'html' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => setContentType('html')}
                >
                  HTML
                </Button>
              </div>
            </div>
            {isHtml && (
              <div className="space-y-2">
                {/* Toolbar — only visible in HTML mode. The buttons
                    insert snippets at the caret; ⌘B / ⌘I also work as
                    keyboard shortcuts. */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex flex-wrap items-center gap-1">
                    {TOOLBAR_ACTIONS.map((action) => {
                      const Icon = action.icon
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => applyAction(action)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                          title={action.hint ?? action.label}
                          aria-label={action.label}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant={viewMode === 'edit' ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 text-[11px] px-2 gap-1"
                      onClick={() => setViewMode('edit')}
                      title="仅编辑"
                    >
                      <Pencil className="w-3 h-3" />
                      编辑
                    </Button>
                    <Button
                      variant={viewMode === 'split' ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 text-[11px] px-2 gap-1"
                      onClick={() => setViewMode('split')}
                      title="分屏"
                    >
                      <Columns2 className="w-3 h-3" />
                      分屏
                    </Button>
                    <Button
                      variant={viewMode === 'preview' ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 text-[11px] px-2 gap-1"
                      onClick={() => setViewMode('preview')}
                      title="仅预览"
                    >
                      <Eye className="w-3 h-3" />
                      预览
                    </Button>
                  </div>
                </div>

                {viewMode === 'edit' && (
                  <textarea
                    ref={contentRef}
                    className="w-full text-sm bg-background border border-input rounded px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono text-xs"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleContentKeyDown}
                    placeholder={`<h3>标题</h3>
<p>段落内容，可以使用 <strong>加粗</strong> 和 <em>斜体</em>。</p>
<ul>
  <li>列表项一</li>
  <li>列表项二</li>
</ul>`}
                    rows={10}
                  />
                )}

                {viewMode === 'preview' && (
                  <div
                    className="w-full min-h-[200px] max-h-[400px] overflow-y-auto border border-input rounded px-3 py-2 text-xs prose prose-sm dark:prose-invert max-w-none prose-code:text-[11px] prose-pre:bg-muted prose-pre:text-[11px] prose-table:text-[11px]"
                    dangerouslySetInnerHTML={previewHtml ?? { __html: '<em>无内容</em>' }}
                  />
                )}

                {viewMode === 'split' && (
                  <div className="grid grid-cols-2 gap-2">
                    <textarea
                      ref={contentRef}
                      className="w-full text-sm bg-background border border-input rounded px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono text-xs"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={handleContentKeyDown}
                      placeholder="<h3>标题</h3>…"
                      rows={10}
                    />
                    <div
                      className="w-full min-h-[200px] max-h-[400px] overflow-y-auto border border-input rounded px-3 py-2 text-xs prose prose-sm dark:prose-invert max-w-none prose-code:text-[11px] prose-pre:bg-muted prose-pre:text-[11px] prose-table:text-[11px]"
                      dangerouslySetInnerHTML={previewHtml ?? { __html: '<em>无内容</em>' }}
                    />
                  </div>
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
