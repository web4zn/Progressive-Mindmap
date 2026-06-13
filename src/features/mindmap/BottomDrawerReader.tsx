/**
 * BottomDrawerReader — bottom-docked panel for reading / editing
 * a mindmap node's full content.
 *
 * Two modes:
 *   - **read**  : sanitised HTML render of `node.content`
 *   - **edit**  : monospace textarea with format selector (text / html)
 *
 * Visual contract:
 *   - Slides up from the bottom of the canvas as a fixed panel
 *   - Drag handle on top edge for height resize (120px – 70vh)
 *   - Node title + pattern tag + mode indicator in the header
 *   - Dirty detection on edit mode; confirmation before close / switch
 *   - Ctrl+Enter to save in edit mode
 *   - Esc to close (read mode) or cancel (edit mode)
 *   - Save briefly flashes a "✓ 已保存" feedback before returning to read mode
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Pencil, X, Check, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sanitizeHtml } from '@/lib/html-sanitizer'
import { cn } from '@/lib/utils'
import { useResizable } from '@/hooks/useResizable'
import type { MindMapNode } from '@/types/mindmap'

// ── Constants ──────────────────────────────────────────────────────────────

const DRAWER_HEIGHT_STORAGE_KEY = 'progressive-mindmap:drawer-height'
const DRAWER_MIN_HEIGHT = 120
const DRAWER_MAX_HEIGHT = 0.7 // 70vh (computed at mount time)
const DRAWER_DEFAULT_HEIGHT = 300

function readStoredDrawerHeight(): number {
  if (typeof window === 'undefined') return DRAWER_DEFAULT_HEIGHT
  try {
    const raw = window.localStorage.getItem(DRAWER_HEIGHT_STORAGE_KEY)
    if (!raw) return DRAWER_DEFAULT_HEIGHT
    const n = Number(raw)
    if (!Number.isFinite(n)) return DRAWER_DEFAULT_HEIGHT
    return Math.min(Math.max(Math.round(n), DRAWER_MIN_HEIGHT), window.innerHeight * DRAWER_MAX_HEIGHT)
  } catch {
    return DRAWER_DEFAULT_HEIGHT
  }
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface BottomDrawerReaderProps {
  /** The node to display. `null` = closed. */
  node: MindMapNode | null
  /** Current mode. */
  mode: 'read' | 'edit'
  /** Called when the user wants to close the drawer (✕ / Esc / pane click). */
  onClose: () => void
  /** Called when the user clicks the edit button (read → edit mode). */
  onEdit?: () => void
  /** Called when the user cancels in edit mode (edit → read mode, stays open). */
  onCancel?: () => void
  /** Called when the user saves edits in edit mode. */
  onSave: (
    nodeId: string,
    label: string,
    summary: string,
    content?: string,
    contentType?: 'text' | 'html',
  ) => void
  /** The mindmap pattern (for the header tag). */
  pattern?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Friendly pattern label. Mirrors `MindMapHeader`'s mapping. */
const PATTERN_LABELS: Record<string, string> = {
  auto: '自动',
  '5w1h': '5W1H',
  tech: '技术',
  'pros-cons': '优缺点',
}

// ── Component ───────────────────────────────────────────────────────────────

export default function BottomDrawerReader({
  node,
  mode: externalMode,
  onClose,
  onEdit,
  onCancel,
  onSave,
  pattern,
}: BottomDrawerReaderProps) {
  const open = node !== null

  // ── Resize ─────────────────────────────────────────────────────────────
  // Height-only resize via the top drag handle. The bottom edge is fixed
  // to the viewport bottom; dragging the handle up grows the drawer.
  const maxHeight = typeof window !== 'undefined' ? window.innerHeight * DRAWER_MAX_HEIGHT : 400
  const {
    size: drawerSize,
    resizeHandleRef,
    startResize,
  } = useResizable({
    defaultSize: { width: 0, height: readStoredDrawerHeight() },
    minSize: { width: 0, height: DRAWER_MIN_HEIGHT },
    maxSize: { width: 0, height: maxHeight },
    direction: 't',
  })

  // Persist height to localStorage after resize.
  const heightMountedRef = useRef(false)
  useEffect(() => {
    if (!heightMountedRef.current) {
      heightMountedRef.current = true
      return
    }
    try {
      window.localStorage.setItem(DRAWER_HEIGHT_STORAGE_KEY, String(drawerSize.height))
    } catch {
      // silent
    }
  }, [drawerSize.height])

  // ── Edit state ─────────────────────────────────────────────────────────
  const [label, setLabel] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState<'text' | 'html'>('text')
  const [contentTab, setContentTab] = useState<'edit' | 'split' | 'preview'>('edit')
  const [isDirty, setIsDirty] = useState(false)
  const [showSavedFeedback, setShowSavedFeedback] = useState(false)
  const [pendingConfirmAction, setPendingConfirmAction] = useState<(() => void) | null>(null)

  // ── Split resize ─────────────────────────────────────────────────────────
  const [splitRatio, setSplitRatio] = useState(0.5)
  const splitDragRef = useRef<{
    startX: number
    startRatio: number
  } | null>(null)

  const onSplitDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      splitDragRef.current = { startX: e.clientX, startRatio: splitRatio }
      const onMove = (ev: MouseEvent) => {
        if (!splitDragRef.current) return
        // Use the container width (queried at drag time for responsiveness)
        const container = (ev.target as HTMLElement).closest('[data-split-container]')
        if (!container) return
        const rect = container.getBoundingClientRect()
        const dx = ev.clientX - splitDragRef.current.startX
        const ratio = splitDragRef.current.startRatio + dx / rect.width
        setSplitRatio(Math.min(Math.max(ratio, 0.2), 0.8))
      }
      const onUp = () => {
        splitDragRef.current = null
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      document.body.style.cursor = 'col-resize'
    },
    [splitRatio],
  )

  // Populate local state when the node or mode changes.
  const prevNodeIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!node) return
    const nodeChanged = node.id !== prevNodeIdRef.current
    prevNodeIdRef.current = node.id

    if (nodeChanged) {
      // Switching to a new node — reset local state.
      setLabel(node.label)
      setSummary(node.summary)
      setContent(node.content ?? '')
      setContentType((node.contentType as 'text' | 'html' | undefined) ?? 'text')
      setIsDirty(false)
      setShowSavedFeedback(false)
      setPendingConfirmAction(null)
    } else if (externalMode === 'edit') {
      // Re-entering edit mode on the same node (e.g. after save → read → edit)
      setLabel(node.label)
      setSummary(node.summary)
      setContent(node.content ?? '')
      setContentType((node.contentType as 'text' | 'html' | undefined) ?? 'text')
      setIsDirty(false)
    }
    // Only reset on node change or mode switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id, externalMode])

  // ── Dirty tracking ─────────────────────────────────────────────────────
  // We track dirtiness by comparing current edit state to the node's persisted values.
  // This way the user sees "unsaved changes" only when something actually changed.
  useEffect(() => {
    if (!node || externalMode !== 'edit') {
      setIsDirty(false)
      return
    }
    const changed =
      label !== node.label ||
      summary !== node.summary ||
      content !== (node.content ?? '') ||
      contentType !== ((node.contentType as 'text' | 'html' | undefined) ?? 'text')
    setIsDirty(changed)
  }, [label, summary, content, contentType, node, externalMode])

  // ── Save handler ───────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!node) return
    onSave(
      node.id,
      label.trim(),
      summary.trim(),
      contentType === 'text' ? undefined : content,
      contentType,
    )
    setShowSavedFeedback(true)
    setIsDirty(false)
    setTimeout(() => setShowSavedFeedback(false), 1500)
  }, [node, label, summary, content, contentType, onSave])

  // ── Close / confirm helpers ────────────────────────────────────────────
  /** Close the drawer entirely (X button, Esc in read mode). */
  const attemptClose = useCallback(() => {
    if (isDirty && externalMode === 'edit') {
      setPendingConfirmAction(() => onClose)
    } else {
      onClose()
    }
  }, [isDirty, externalMode, onClose])

  /** Cancel edit mode → back to read mode (footer cancel, Esc in edit mode). */
  const attemptCancel = useCallback(() => {
    if (isDirty && externalMode === 'edit') {
      setPendingConfirmAction(() => onCancel?.() ?? onClose())
    } else if (onCancel) {
      onCancel()
    } else {
      onClose()
    }
  }, [isDirty, externalMode, onCancel, onClose])

  const confirmAndCancel = useCallback(() => {
    setPendingConfirmAction(null)
    onCancel?.()
  }, [onCancel])

  const cancelPendingAction = useCallback(() => {
    setPendingConfirmAction(null)
  }, [])

  // ── Keyboard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (pendingConfirmAction) {
          cancelPendingAction()
          return
        }
        if (externalMode === 'edit') {
          attemptCancel()
        } else {
          attemptClose()
        }
      }
      if (externalMode === 'edit' && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, externalMode, pendingConfirmAction, attemptClose, attemptCancel, cancelPendingAction, handleSave])

  // ── Focus the label input on entering edit mode ────────────────────────
  const labelInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open && externalMode === 'edit') {
      labelInputRef.current?.focus()
      labelInputRef.current?.select()
    }
  }, [open, externalMode, node?.id])

  // ── Style adapters ─────────────────────────────────────────────────────
  // useResizable returns width+height but we only need height for vertical
  // resize. The `direction: 'br'` hook handles both axes; we ignore width.
  const drawerHeight = Math.max(DRAWER_MIN_HEIGHT, Math.min(drawerSize.height, maxHeight))

  // ── Render helpers ─────────────────────────────────────────────────────
  const patternLabel = pattern ? (PATTERN_LABELS[pattern] ?? pattern) : ''
  const safeContentHtml = useMemo(() => {
    if (!node?.content) return ''
    return sanitizeHtml(node.content)
  }, [node?.content])

  // ── Guard: no node → render nothing ────────────────────────────────────
  if (!open) return null

  return (
    <aside
      role="dialog"
      aria-label={externalMode === 'edit' ? `编辑节点 ${node.label}` : `阅读节点 ${node.label}`}
      data-testid="bottom-drawer-reader"
      data-mode={externalMode}
      className="absolute bottom-0 left-0 right-0 z-50 flex flex-col border-t border-border bg-background shadow-2xl transition-transform duration-300 ease-out"
      style={{ height: `${drawerHeight}px` }}
    >
      {/* ── Drag handle ──────────────────────────────────────────────────── */}
      <div
        ref={resizeHandleRef}
        onMouseDown={startResize}
        role="separator"
        aria-orientation="horizontal"
        aria-label="拖动调整面板高度"
        title="拖动调整高度"
        className="group flex items-center justify-center h-5 cursor-ns-resize shrink-0 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-8 h-0.5 rounded-full bg-muted-foreground/30 group-hover:bg-muted-foreground/60 transition-colors" />
          <ChevronUp className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
          <span className="w-8 h-0.5 rounded-full bg-muted-foreground/30 group-hover:bg-muted-foreground/60 transition-colors" />
        </div>
      </div>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold truncate" title={node.label}>
            {node.label}
          </h2>
          {patternLabel && (
            <span
              data-pattern={pattern}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none uppercase tracking-wider"
              style={{
                backgroundColor: 'var(--flow-pattern)',
                color: '#fff',
              }}
            >
              {patternLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mode indicator */}
          {externalMode === 'edit' && (
            <span className="text-[11px] text-muted-foreground mr-1">编辑中</span>
          )}

          {/* Edit button (read mode only) */}
          {externalMode === 'read' && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit?.()}
              aria-label="编辑节点"
              title="编辑"
              data-testid="drawer-edit-btn"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={attemptClose}
            aria-label="关闭面板"
            title="关闭（Esc）"
            data-testid="drawer-close-btn"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* ── Pending confirm bar (dirty → closing) ──────────────────────────── */}
      {pendingConfirmAction && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 shrink-0">
          <span className="text-xs text-amber-800 dark:text-amber-200">
            有未保存的修改，确认关闭？
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px]"
              onClick={cancelPendingAction}
            >
              取消
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
              onClick={confirmAndCancel}
            >
              不保存关闭
            </Button>
          </div>
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {externalMode === 'read' ? (
          /* ── Read mode: sanitised HTML ────────────────────────────────── */
          <div className="px-4 py-3">
            {node.summary && (
              <p className="text-xs text-muted-foreground mb-3 italic leading-relaxed">
                {node.summary}
              </p>
            )}
            {safeContentHtml ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none
                  prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                  prose-h2:text-base prose-h3:text-sm prose-h4:text-sm
                  prose-p:my-1.5 prose-p:leading-relaxed
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  prose-code:text-[12px] prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  prose-pre:bg-muted prose-pre:text-[12px] prose-pre:rounded-lg
                  prose-blockquote:border-l-primary prose-blockquote:pl-3 prose-blockquote:my-2
                  prose-ul:my-1 prose-ol:my-1
                  prose-li:my-0.5
                  prose-table:text-[12px] prose-th:bg-muted
                  prose-img:rounded-lg"
                dangerouslySetInnerHTML={{ __html: safeContentHtml }}
              />
            ) : (
              <p className="text-xs text-muted-foreground italic">节点无附加内容</p>
            )}
          </div>
        ) : (
          /* ── Edit mode: form ─────────────────────────────────────────── */
          <div className="px-4 py-3 space-y-3">
            {/* Label */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">名称</label>
              <input
                ref={labelInputRef}
                className="w-full text-sm font-medium bg-background border border-input rounded px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="节点名称"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">摘要</label>
              <textarea
                className="w-full text-sm bg-background border border-input rounded px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="摘要内容"
                rows={2}
              />
            </div>

            {/* Content type selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">内容格式</label>
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
                  onClick={() => { setContentType('html'); setContentTab('edit') }}
                >
                  HTML
                </Button>
              </div>
            </div>

            {/* Content area tabs (HTML mode only): 编辑 / 对比 / 预览 */}
            {contentType === 'html' && (
              <div className="flex gap-1 border-b border-border">
                <button
                  className={cn(
                    'px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors',
                    contentTab === 'edit'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setContentTab('edit')}
                >
                  编辑
                </button>
                <button
                  className={cn(
                    'px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors',
                    contentTab === 'split'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setContentTab('split')}
                >
                  对比
                </button>
                <button
                  className={cn(
                    'px-3 py-1.5 text-[11px] font-medium border-b-2 -mb-px transition-colors',
                    contentTab === 'preview'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setContentTab('preview')}
                >
                  预览
                </button>
              </div>
            )}

            {/* Content editor / split / preview */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">内容</label>

              {contentType === 'html' && contentTab === 'split' ? (
                /* ── Split: editor left, preview right ────────────────── */
                <div
                  data-split-container
                  className="flex min-h-[180px] max-h-[350px] border border-input rounded overflow-hidden"
                >
                  <textarea
                    className="block resize-none border-0 rounded-none outline-none focus:ring-0 px-3 py-2 text-sm font-mono text-xs bg-background"
                    style={{ width: `${splitRatio * 100}%` }}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="<h3>标题</h3>
<p>段落内容…</p>"
                  />
                  {/* ── Draggable divider ──────────────────────────────── */}
                  <div
                    className="w-1.5 cursor-col-resize shrink-0 bg-border hover:bg-primary/40 active:bg-primary/60 transition-colors relative"
                    onMouseDown={onSplitDividerMouseDown}
                  >
                    <div className="absolute inset-y-0 -left-1 -right-1" />
                  </div>
                  <div
                    className="overflow-y-auto px-3 py-2 bg-background flex-1"
                    style={{ width: `${(1 - splitRatio) * 100}%` }}
                  >
                    {content ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none
                          prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5
                          prose-p:my-1 prose-p:leading-relaxed
                          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                          prose-code:text-[11px] prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                          prose-pre:bg-muted prose-pre:text-[11px] prose-pre:rounded-lg"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground italic">无内容</p>
                    )}
                  </div>
                </div>
              ) : contentType === 'html' && contentTab === 'preview' ? (
                /* ── HTML full preview ────────────────────────────────── */
                <div className="min-h-[120px] max-h-[350px] overflow-y-auto border border-input rounded px-3 py-2 bg-background">
                  {content ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none
                        prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5
                        prose-p:my-1 prose-p:leading-relaxed
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        prose-code:text-[11px] prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                        prose-pre:bg-muted prose-pre:text-[11px] prose-pre:rounded-lg"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground italic">无内容</p>
                  )}
                </div>
              ) : (
                /* ── Text / HTML editor ───────────────────────────────── */
                <textarea
                  className={cn(
                    'w-full text-sm bg-background border border-input rounded px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 resize-none',
                    contentType === 'html' && 'font-mono text-xs',
                  )}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    contentType === 'html'
                      ? '<h3>标题</h3>\n<p>段落内容…</p>'
                      : '纯文本内容'
                  }
                  rows={8}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer (edit mode only) ──────────────────────────────────────── */}
      {externalMode === 'edit' && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-border shrink-0 bg-muted/30">
          <span className="text-[11px] text-muted-foreground">
            {isDirty ? '有未保存的修改' : '内容未更改'}
            {showSavedFeedback && (
              <span className="ml-2 text-green-600 dark:text-green-400 font-medium animate-pulse">
                ✓ 已保存
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={attemptCancel}
              data-testid="drawer-cancel-btn"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!label.trim() || showSavedFeedback}
              data-testid="drawer-save-btn"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              保存
            </Button>
          </div>
        </div>
      )}
    </aside>
  )
}
