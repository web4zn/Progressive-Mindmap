import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
  X,
} from 'lucide-react'
import { sanitizeHtml } from '@/lib/html-sanitizer'
import { markdownToHtml } from '@/lib/markdown'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useResizable } from '@/hooks/useResizable'
import type { MindMapNode } from '@/types/mindmap'
import {
  FLOATING_PANEL_BASE_CLASSES,
  FLOATING_PANEL_OPEN_CLASSES,
  FLOATING_PANEL_CLOSED_CLASSES,
} from './floatingPanelClasses'

type ContentType = 'text' | 'html' | 'markdown'

/**
 * Card-width persistence. The user can drag the left edge of
 * the in-canvas editor to make it wider or narrower; we remember
 * the choice across re-opens so the user doesn't have to drag
 * every time. Persisted in `localStorage` (not the IndexedDB
 * `mindmapStore`) because card width is a UI preference, not
 * mindmap data — same pattern as `useTheme`.
 *
 * Bounds: 360–640px. Below 360 the split view collapses into
 * illegible columns; above 640 the card starts eating the
 * canvas's central node area on common 1280px viewports.
 */
const EDITOR_WIDTH_STORAGE_KEY = 'progressive-mindmap:node-editor-width'
const EDITOR_MIN_WIDTH = 360
const EDITOR_MAX_WIDTH = 640
const EDITOR_DEFAULT_WIDTH = 420

function readStoredEditorWidth(): number {
  if (typeof window === 'undefined') return EDITOR_DEFAULT_WIDTH
  try {
    const raw = window.localStorage.getItem(EDITOR_WIDTH_STORAGE_KEY)
    if (!raw) return EDITOR_DEFAULT_WIDTH
    const n = Number(raw)
    if (!Number.isFinite(n)) return EDITOR_DEFAULT_WIDTH
    return Math.min(Math.max(Math.round(n), EDITOR_MIN_WIDTH), EDITOR_MAX_WIDTH)
  } catch {
    return EDITOR_DEFAULT_WIDTH
  }
}

interface NodeEditorCardProps {
  node: MindMapNode
  open: boolean
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
 * equivalent; the card picks the right pair at runtime based on
 * `contentType`. Migrated verbatim from `MindMapEditModal`
 * (which this component replaces) — see proposal `node-editor-card`
 * for the deletion rationale.
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

/**
 * In-canvas, top-right floating card for editing a single
 * mindmap node. Replaces the centered `MindMapEditModal` dialog.
 *
 * Visual / behavioural contract (see `openspec/specs/node-editor-card`):
 *
 * - Anchored `top-3 right-3` of the canvas's `position: relative`
 *   wrapper, identical to `MindMapOutline`.
 * - Width 420px on ≥ 1024px viewports, `min(420px, calc(100vw-24px))`
 *   below that.
 * - No `body` scroll lock, no `fixed inset-0` backdrop, no
 *   `createPortal`, no resize handle. The canvas stays
 *   interactive while the card is open.
 * - Esc closes the card (document-level keydown, mirrors
 *   `MindMapOutline`).
 * - The element stays mounted across `open` flips so the
 *   slide-in / fade-in transition can play.
 */
export default function NodeEditorCard({
  node,
  open,
  onConfirm,
  onCancel,
}: NodeEditorCardProps) {
  const [label, setLabel] = useState(node.label)
  const [summary, setSummary] = useState(node.summary)
  const [content, setContent] = useState(node.content ?? '')
  // node.contentType comes from persisted data and is typed as the
  // narrower 'text' | 'html' in the MindMapNode type. We accept all
  // three runtime values and fall through to 'text' for anything
  // unknown (carried over from `MindMapEditModal`).
  const [contentType, setContentType] = useState<ContentType>(
    (() => {
      const raw = node.contentType as string | undefined
      if (raw === 'html' || raw === 'markdown' || raw === 'text') return raw
      return 'text'
    })(),
  )
  const [viewMode, setViewMode] = useState<HtmlViewMode>('split')
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  // Width-only resize, anchored to the left edge of the card.
  // Height is intentionally not resizable — the card already
  // fills the available canvas height (max-h-[calc(100%-24px)])
  // and grows naturally with its content. Direction `'l'`
  // selects the left-edge handle and skips the height axis in
  // `useResizable`'s mousemove handler.
  const {
    size: cardSize,
    resizeHandleRef,
    startResize,
    reset: resetWidth,
  } = useResizable({
    defaultSize: { width: readStoredEditorWidth(), height: 0 },
    minSize: { width: EDITOR_MIN_WIDTH, height: 0 },
    maxSize: { width: EDITOR_MAX_WIDTH, height: 0 },
    direction: 'l',
  })

  // Persist the width after every drag so the next open restores
  // the user's choice. We skip the very first render (when
  // `cardSize.width` is just the read-back value from
  // `localStorage`) — not strictly required since the value is
  // identical, but it avoids a useless write on mount.
  const widthMountedRef = useRef(false)
  useEffect(() => {
    if (!widthMountedRef.current) {
      widthMountedRef.current = true
      return
    }
    try {
      window.localStorage.setItem(EDITOR_WIDTH_STORAGE_KEY, String(cardSize.width))
    } catch {
      // Private mode / quota / disabled storage — silently keep
      // the in-memory width for this session.
    }
  }, [cardSize.width])

  // Esc to close. Mirrors `MindMapOutline` / `MindMapDrawer` —
  // bound at the document level so the user can hit Esc even when
  // the card has no focused element.
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  // Reset the editor on node change (a parent that re-uses the
  // same card instance with a new node should see a fresh state).
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
  }, [node.id, node.label, node.summary, node.content, node.contentType])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open])

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
            ? {
                open: action.mdWrap?.open ?? '',
                close: action.mdWrap?.close ?? '',
                placeholder:
                  action.mdWrap?.placeholder ?? action.wrap?.placeholder,
              }
            : {
                open: action.mdBlock?.open ?? '',
                close: action.mdBlock?.close ?? '',
                placeholder: action.mdBlock?.placeholder ?? '',
              })
        : (action.wrap
            ? {
                open: action.wrap.open,
                close: action.wrap.close,
                placeholder: action.wrap.placeholder,
              }
            : {
                open: action.block?.open ?? '',
                close: action.block?.close ?? '',
                placeholder: action.block?.placeholder ?? '',
              })

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

  // ⌘B / ⌘I shortcuts inside the content textarea. Mirrors the
  // modal: only fires when the textarea has focus, so it never
  // collides with canvas-level hotkeys.
  const handleContentKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault()
        applyAction(TOOLBAR_ACTIONS[4]!) // bold
      } else if (event.key === 'i' || event.key === 'I') {
        event.preventDefault()
        applyAction(TOOLBAR_ACTIONS[5]!) // italic
      }
    },
    [applyAction],
  )

  const filteredActions = useMemo(
    () =>
      TOOLBAR_ACTIONS.filter((a) => {
        if (isMd && a.htmlOnly) return false
        if (!isMd && a.id === 'table' && contentType === 'text') return true
        return true
      }),
    [isMd, contentType],
  )

  // Header label — show the node's current label (truncated to 32
  // chars) so the user always knows which node they're editing.
  const headerLabel = node.label.length > 32 ? `${node.label.slice(0, 32)}…` : node.label

  return (
    <aside
      role="dialog"
      aria-label={`编辑节点 ${node.label}`}
      aria-hidden={!open}
      data-state={open ? 'open' : 'closed'}
      data-testid="node-editor-card"
      // Width is user-resizable (drag the left edge, or
      // double-click to reset to the default). The inline style
      // only carries the live px value — the small-viewport
      // gutter is enforced via the `max-w-[calc(100vw-24px)]`
      // utility below, which lets Tailwind's JIT handle the
      // `calc()` (inline styles can't reliably carry CSS
      // functional values in some test renderers).
      style={{ width: `${cardSize.width}px` }}
      className={cn(
        FLOATING_PANEL_BASE_CLASSES,
        // Cap the card to the viewport with a 12px gutter on
        // each side, and to the canvas height (so it never
        // bleeds out the bottom). On ≥1024px viewports the
        // chosen width is well below the max and the user
        // just sees the dragged width.
        'max-w-[calc(100vw-24px)] max-h-[calc(100%-24px)]',
        open ? FLOATING_PANEL_OPEN_CLASSES : FLOATING_PANEL_CLOSED_CLASSES,
      )}
    >
      {/*
        Bottom-left resize grip. Modelled on the
        `MindMapEditModal` (now removed) resize handle — a
        18×18px square in the corner with a 6-dot diagonal
        grip SVG. That modal used the handle in the
        bottom-RIGHT corner with a ↘ density gradient; here
        the card is anchored to `right-3` (so the right edge
        is fixed) and only width is resizable, so we mirror
        the grip to the bottom-LEFT and flip the gradient
        to ↗.

        Drag target is the whole 18×18 corner — small enough
        to stay out of the user's way when they're typing,
        big enough to land with a casual aim. `cursor-ew-resize`
        because the only adjusted axis is width (the hook is
        called with `direction: 'l'` so the height change
        in the mousemove handler is ignored).
      */}
      <div
        ref={resizeHandleRef}
        data-testid="node-editor-resize-handle"
        onMouseDown={startResize}
        onDoubleClick={resetWidth}
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调整编辑器宽度,双击重置为默认"
        title="拖动调整宽度 · 双击重置"
        className="group absolute left-1.5 bottom-1.5 w-[18px] h-[18px] flex items-center justify-center cursor-ew-resize rounded-sm text-muted-foreground/60 hover:text-foreground transition-colors"
      >
        {/*
          6-dot diagonal grip. Coordinates mirror the modal's
          bottom-right grip across the vertical axis so the
          density gradient now points at the LEFT-bottom
          corner (where the grip actually lives) instead of
          the right-bottom corner. Concretely: 3 dots share
          the x=3 column, 2 dots share x=7, 1 dot sits at
          x=11 — i.e. column-count falls 3→2→1 from left to
          right, density increases from top-right toward the
          bottom-LEFT. `currentColor` lets the muted colour
          and the hover override flow through from the
          parent's `text-…` classes.
        */}
        <svg
          aria-hidden="true"
          data-testid="node-editor-resize-grip"
          viewBox="0 0 16 16"
          className="w-full h-full fill-current"
        >
          <circle cx="3" cy="5" r="1" />
          <circle cx="3" cy="9" r="1" />
          <circle cx="7" cy="9" r="1" />
          <circle cx="3" cy="13" r="1" />
          <circle cx="7" cy="13" r="1" />
          <circle cx="11" cy="13" r="1" />
        </svg>
      </div>
      <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-1.5 min-w-0">
          <Pencil className="w-4 h-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold truncate" title={node.label}>
            编辑：{headerLabel}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCancel}
          aria-label="关闭编辑器"
          title="关闭（Esc）"
        >
          <X className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
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
              {/* Toolbar — sticky on top of the scroll container so
                  it follows the user as they scroll within the
                  editor body. Mirrors the modal's toolbar layout. */}
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
      <div className="flex justify-end gap-2 px-3 py-2 border-t border-border bg-popover">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          data-testid="node-editor-cancel"
        >
          取消
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          data-testid="node-editor-confirm"
        >
          确认
        </Button>
      </div>
    </aside>
  )
}
