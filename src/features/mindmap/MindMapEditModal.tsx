import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Bold,
  Code,
  Columns2,
  Eye,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Pencil,
  Quote,
  Table as TableIcon,
  Heading1,
} from 'lucide-react'
import { sanitizeHtml } from '@/lib/html-sanitizer'
import { markdownToHtml } from '@/lib/markdown'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MindMapNode } from '@/types/mindmap'

type ContentType = 'text' | 'html' | 'markdown'

interface MindMapEditModalProps {
  node: MindMapNode
  onConfirm: (
    nodeId: string,
    label: string,
    summary: string,
    content?: string,
    contentType?: 'text' | 'html' | 'markdown',
  ) => void
  onCancel: () => void
}

type HtmlViewMode = 'edit' | 'preview' | 'split'

interface ToolbarAction {
  id: string
  label: string
  icon: typeof Bold
  /** Wrap action — wraps the current selection (or inserts a placeholder). */
  wrap?: { open: string; close: string; placeholder?: string }
  /** Block action — inserts a fresh block on its own lines, caret inside. */
  block?: { open: string; close: string; placeholder: string }
  /** Markdown counterpart — used when `contentType === 'markdown'`. */
  mdWrap?: { open: string; close: string; placeholder?: string }
  mdBlock?: { open: string; close: string; placeholder: string }
  hint?: string
  /** When true, only show this button in markdown mode. */
  mdOnly?: boolean
  /** When true, only show this button in HTML mode. */
  htmlOnly?: boolean
}

/**
 * Toolbar actions. Each entry carries both an HTML and a markdown
 * equivalent; the modal picks the right pair at runtime based on
 * `contentType`. Stage A2 only had the HTML pair.
 */
const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    id: 'h1',
    label: 'H1',
    icon: Heading1,
    block: { open: '<h1>', close: '</h1>', placeholder: '大标题' },
    mdBlock: { open: '# ', close: '', placeholder: '大标题' },
    hint: '一级标题',
  },
  {
    id: 'h2',
    label: 'H2',
    icon: Heading2,
    block: { open: '<h2>', close: '</h2>', placeholder: '节标题' },
    mdBlock: { open: '## ', close: '', placeholder: '节标题' },
    hint: '二级标题',
  },
  {
    id: 'h3',
    label: 'H3',
    icon: Heading3,
    block: { open: '<h3>', close: '</h3>', placeholder: '小节标题' },
    mdBlock: { open: '### ', close: '', placeholder: '小节标题' },
    hint: '三级标题',
  },
  {
    id: 'h4',
    label: 'H4',
    icon: Heading4,
    block: { open: '<h4>', close: '</h4>', placeholder: '次级标题' },
    mdBlock: { open: '#### ', close: '', placeholder: '次级标题' },
    hint: '四级标题',
  },
  {
    id: 'bold',
    label: '加粗',
    icon: Bold,
    wrap: { open: '<strong>', close: '</strong>', placeholder: '加粗文本' },
    mdWrap: { open: '**', close: '**', placeholder: '加粗文本' },
    hint: '加粗（⌘B）',
  },
  {
    id: 'italic',
    label: '斜体',
    icon: Italic,
    wrap: { open: '<em>', close: '</em>', placeholder: '斜体文本' },
    mdWrap: { open: '*', close: '*', placeholder: '斜体文本' },
    hint: '斜体（⌘I）',
  },
  {
    id: 'ul',
    label: '无序列表',
    icon: List,
    block: { open: '<ul>\n  <li>', close: '</li>\n</ul>', placeholder: '列表项' },
    mdBlock: { open: '- ', close: '', placeholder: '列表项' },
    hint: '无序列表',
  },
  {
    id: 'ol',
    label: '有序列表',
    icon: ListOrdered,
    block: { open: '<ol>\n  <li>', close: '</li>\n</ol>', placeholder: '列表项' },
    mdBlock: { open: '1. ', close: '', placeholder: '列表项' },
    hint: '有序列表',
  },
  {
    id: 'code',
    label: '代码',
    icon: Code,
    wrap: { open: '<code>', close: '</code>', placeholder: 'code' },
    mdWrap: { open: '`', close: '`', placeholder: 'code' },
    hint: '行内代码',
  },
  {
    id: 'link',
    label: '链接',
    icon: LinkIcon,
    wrap: { open: '<a href="https://">', close: '</a>', placeholder: '链接文字' },
    mdWrap: { open: '[', close: '](https://)', placeholder: '链接文字' },
    hint: '超链接',
  },
  {
    id: 'image',
    label: '图片',
    icon: ImageIcon,
    block: {
      open: '<img src="https://" alt="',
      close: '" />',
      placeholder: '描述',
    },
    mdBlock: { open: '![', close: '](https://)', placeholder: '描述' },
    hint: '插入图片',
  },
  {
    id: 'table',
    label: '表格',
    icon: TableIcon,
    htmlOnly: true,
    block: {
      open:
        '<table>\n  <thead>\n    <tr><th>列1</th><th>列2</th><th>列3</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>',
      close: '</td><td></td><td></td></tr>\n    <tr><td></td><td></td><td></td></tr>\n  </tbody>\n</table>',
      placeholder: '',
    },
    hint: '3x3 表格',
  },
  {
    id: 'quote',
    label: '引用',
    icon: Quote,
    block: { open: '<blockquote>', close: '</blockquote>', placeholder: '引用内容' },
    mdBlock: { open: '> ', close: '', placeholder: '引用内容' },
    hint: '引用',
  },
]

const DEFAULT_SIZE = { width: 480, height: 560 }
const MIN_SIZE = { width: 360, height: 400 }
const MAX_SIZE = { width: 900, height: 800 }

export default function MindMapEditModal({ node, onConfirm, onCancel }: MindMapEditModalProps) {
  const [label, setLabel] = useState(node.label)
  const [summary, setSummary] = useState(node.summary)
  const [content, setContent] = useState(node.content ?? '')
  // node.contentType comes from persisted data and is typed as the
  // narrower 'text' | 'html' in the MindMapNode type. Stage B adds
  // 'markdown' as a third option; the runtime accepts all three and
  // we just fall through to 'text' for anything unknown.
  const [contentType, setContentType] = useState<ContentType>(
    (() => {
      const raw = node.contentType as string | undefined
      if (raw === 'html' || raw === 'markdown' || raw === 'text') return raw
      return 'text'
    })(),
  )
  const [viewMode, setViewMode] = useState<HtmlViewMode>('split')
  const [size, setSize] = useState(DEFAULT_SIZE)
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  // Keep a ref in sync with the latest size so the resize handle
  // (which is wired to window mousemove once on mousedown) always
  // sees the current value, not the stale closure value.
  const sizeRef = useRef(size)
  useEffect(() => {
    sizeRef.current = size
  }, [size])

  // Stage B §6: lock body scroll while the modal is mounted. The
  // base-ui Dialog (used elsewhere in the app) already does this,
  // but we hand-roll the modal so we have to do it ourselves.
  // We remember the previous overflow value and restore it on
  // unmount, so other modals opened in sequence don't accumulate
  // hidden body locks.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Reset the editor on node change (defensive: a parent that
  // re-uses the same modal instance with a new node should see a
  // fresh state). The "reset state when a prop changes" pattern
  // is the documented React workaround; the body is intentionally
  // a set of `setX(...)` calls and the lint rule is satisfied by
  // a single explicit disable at the top of the effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabel(node.label)
    setSummary(node.summary)
    setContent(node.content ?? '')
    setContentType(
      (() => {
        const raw = node.contentType as string | undefined
        if (raw === 'html' || raw === 'markdown' || raw === 'text') return raw
        return 'text'
      })(),
    )
    setSize(DEFAULT_SIZE)
  }, [node.id, node.label, node.summary, node.content, node.contentType])

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
        // Only persist the rich content when the user actually picked
        // a rich type — pure text mode would just shadow the label.
        contentType === 'text' ? undefined : content,
        contentType,
      )
    }
  }

  const isRich = contentType === 'html' || contentType === 'markdown'
  const isMd = contentType === 'markdown'

  // Preview HTML — when in markdown mode, render MD to HTML first
  // and pipe through the sanitizer so any markdown that survives
  // sanitization is safe to inject.
  const previewHtml = useMemo(() => {
    if (contentType === 'html') return content ? sanitizeHtml(content) : ''
    if (contentType === 'markdown') return content ? sanitizeHtml(markdownToHtml(content)) : ''
    return ''
  }, [content, contentType])

  /**
   * Apply a toolbar action to the textarea at the current selection.
   * Centralised so the wrap / block semantics stay consistent and
   * the markdown variants keep the same UX as HTML.
   */
  const applyAction = useCallback(
    (action: ToolbarAction) => {
      const el = contentRef.current
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const selected = content.slice(start, end)
      const pair = isMd
        ? (action.mdWrap ?? action.wrap
            ? { open: action.mdWrap?.open ?? '', close: action.mdWrap?.close ?? '', placeholder: action.mdWrap?.placeholder ?? action.wrap?.placeholder }
            : { open: action.mdBlock?.open ?? '', close: action.mdBlock?.close ?? '', placeholder: action.mdBlock?.placeholder ?? '' })
        : (action.wrap
            ? { open: action.wrap.open, close: action.wrap.close, placeholder: action.wrap.placeholder }
            : { open: action.block?.open ?? '', close: action.block?.close ?? '', placeholder: action.block?.placeholder ?? '' })

      const replacement = action.wrap || action.mdWrap
        ? `${pair.open}${selected || pair.placeholder || ''}${pair.close}`
        : `${pair.open}${pair.placeholder}${pair.close}`

      const next = content.slice(0, start) + replacement + content.slice(end)
      setContent(next)
      // Place the caret in the middle of the inserted snippet so the
      // user can keep typing. Use a microtask so React commits the
      // new value first.
      requestAnimationFrame(() => {
        el.focus()
        const innerStart = start + pair.open.length
        const innerEnd = innerStart + (selected.length || (pair.placeholder?.length ?? 0))
        el.setSelectionRange(innerStart, innerEnd)
      })
    },
    [content, isMd],
  )

  // Stage A2: ⌘B / ⌘I shortcuts inside the content textarea. We
  // deliberately do *not* re-use `useMindmapHotkeys` here — that
  // hook is for canvas-level shortcuts and is suppressed while the
  // modal is open. These handlers only fire when the textarea has
  // focus.
  const handleContentKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault()
        applyAction(TOOLBAR_ACTIONS[4]!) // bold
      } else if (event.key === 'i' || event.key === 'I') {
        event.preventDefault()
        applyAction(TOOLBAR_ACTIONS[5]!) // italic
      } else if (event.key === 'Escape' && !event.shiftKey) {
        event.preventDefault()
        onCancel()
      }
    },
    [applyAction, onCancel],
  )

  // ── resize handle ───────────────────────────────────────────────
  const startResize = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const startW = sizeRef.current.width
    const startH = sizeRef.current.height
    const previousCursor = document.body.style.cursor
    const previousSelect = document.body.style.userSelect
    document.body.style.cursor = 'nwse-resize'
    document.body.style.userSelect = 'none'

    function onMove(e: MouseEvent) {
      const dw = e.clientX - startX
      const dh = e.clientY - startY
      setSize({
        width: Math.min(MAX_SIZE.width, Math.max(MIN_SIZE.width, startW + dw)),
        height: Math.min(MAX_SIZE.height, Math.max(MIN_SIZE.height, startH + dh)),
      })
    }
    function onUp() {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousSelect
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const filteredActions = useMemo(
    () =>
      TOOLBAR_ACTIONS.filter((a) => {
        if (isMd && a.htmlOnly) return false
        if (!isMd && a.id === 'table' && contentType === 'text') return true
        return true
      }),
    [isMd, contentType],
  )

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="mindmap-edit-modal"
    >
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        className={cn(
          'relative bg-popover border border-border rounded-lg shadow-xl p-5 space-y-4 flex flex-col',
        )}
        style={{ width: size.width, height: size.height, maxWidth: '95vw', maxHeight: '95vh' }}
      >
        <h3 className="text-sm font-semibold">编辑节点</h3>
        <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
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
          <div className="flex flex-col min-h-0">
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
            {isRich && (
              <div className="flex flex-col gap-2 min-h-0">
                {/* Toolbar — sticky on top of the textarea so it
                    follows scroll within the editor body. Stage B
                    expanded the action set (H1/H2/Image/Table) and
                    makes the markdown pair live next to the HTML
                    pair. */}
                <div
                  className="flex items-center justify-between gap-2 flex-wrap sticky top-0 z-10 bg-popover py-1 -mt-1"
                  data-testid="modal-toolbar"
                >
                  <div className="flex flex-wrap items-center gap-1">
                    {filteredActions.map((action) => {
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
                    className={cn(
                      'w-full text-sm bg-background border border-input rounded px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 resize-none',
                      isMd && 'font-mono text-xs',
                    )}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleContentKeyDown}
                    placeholder={
                      isMd
                        ? '# 标题\n\n段落内容，可以使用 **加粗** 和 *斜体*。\n\n- 列表项一\n- 列表项二'
                        : `<h3>标题</h3>
<p>段落内容，可以使用 <strong>加粗</strong> 和 <em>斜体</em>。</p>
<ul>
  <li>列表项一</li>
  <li>列表项二</li>
</ul>`
                    }
                    rows={10}
                  />
                )}

                {viewMode === 'preview' && (
                  <div
                    className="w-full min-h-[200px] max-h-[400px] overflow-y-auto border border-input rounded px-3 py-2 text-xs prose prose-sm dark:prose-invert max-w-none prose-code:text-[11px] prose-pre:bg-muted prose-pre:text-[11px] prose-table:text-[11px]"
                    dangerouslySetInnerHTML={
                      previewHtml
                        ? { __html: previewHtml }
                        : { __html: '<em>无内容</em>' }
                    }
                  />
                )}

                {viewMode === 'split' && (
                  <div className="grid grid-cols-2 gap-2">
                    <textarea
                      ref={contentRef}
                      className={cn(
                        'w-full text-sm bg-background border border-input rounded px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 resize-none',
                        isMd && 'font-mono text-xs',
                      )}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={handleContentKeyDown}
                      placeholder={isMd ? '# 标题' : '<h3>标题</h3>…'}
                      rows={10}
                    />
                    <div
                      className="w-full min-h-[200px] max-h-[400px] overflow-y-auto border border-input rounded px-3 py-2 text-xs prose prose-sm dark:prose-invert max-w-none prose-code:text-[11px] prose-pre:bg-muted prose-pre:text-[11px] prose-table:text-[11px]"
                      dangerouslySetInnerHTML={
                        previewHtml
                          ? { __html: previewHtml }
                          : { __html: '<em>无内容</em>' }
                      }
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

        {/* Resize handle — bottom-right corner. Cursor: nwse-resize. */}
        <div
          role="separator"
          aria-label="调整大小"
          data-testid="modal-resize-handle"
          onMouseDown={startResize}
          className="absolute right-1.5 bottom-1.5 w-4 h-4 cursor-nwse-resize text-muted-foreground hover:text-foreground"
          title="拖拽调整大小"
        >
          <svg viewBox="0 0 16 16" className="w-full h-full" fill="currentColor">
            <circle cx="13" cy="13" r="1" />
            <circle cx="9" cy="13" r="1" />
            <circle cx="5" cy="13" r="1" />
            <circle cx="13" cy="9" r="1" />
            <circle cx="9" cy="9" r="1" />
            <circle cx="13" cy="5" r="1" />
          </svg>
        </div>
      </div>
    </div>,
    document.body,
  )
}
