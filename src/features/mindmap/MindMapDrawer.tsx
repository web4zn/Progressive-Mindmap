import { useEffect } from 'react'
import { X, MessageSquare, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/conversation'

/**
 * Stage B: side drawer for "linked conversations" of the active
 * mindmap. Replaces the inline accordion that used to live in the
 * header and steal 128px of vertical canvas real estate.
 *
 * The drawer:
 *   - Slides in from the right (translateX)
 *   - 320px wide, full height, overlay (no canvas resize)
 *   - Renders the linked conversations + an unlink button per row
 *   - Closes on Esc / outside click / explicit close button
 *   - State is owned by the parent (we receive `open` + `onClose`)
 *
 * We deliberately don't use base-ui's `<Dialog>` for this — Dialog
 * traps focus and locks body scroll, both wrong for a side panel
 * that overlays the canvas without consuming it.
 */
export interface MindMapDrawerProps {
  open: boolean
  onClose: () => void
  /** Title shown at the top. Default "关联会话". */
  title?: string
  /** Mindmap name (shown as muted subtitle). */
  mindmapTitle?: string
  /** All conversations in the workspace — only the linked ones render in the list. */
  conversations: Conversation[]
  activeConversationId: string | null
  onUnlink: (conversationId: string) => void
  /** Optional empty-state CTA — e.g. "去关联会话" button. */
  emptyAction?: React.ReactNode
}

export default function MindMapDrawer({
  open,
  onClose,
  title = '关联会话',
  mindmapTitle,
  conversations,
  activeConversationId,
  onUnlink,
  emptyAction,
}: MindMapDrawerProps) {
  // Esc to close. Bound at the document level so the user can hit
  // Esc even when the drawer has no focused element.
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Click-outside overlay — purely cosmetic, doesn't trap or
          block. The user can still interact with the canvas through
          the open area to the left. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/10 transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        role="dialog"
        aria-label={title}
        aria-hidden={!open}
        data-state={open ? 'open' : 'closed'}
        data-testid="mindmap-drawer"
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] bg-popover text-popover-foreground',
          'border-l border-border shadow-xl flex flex-col',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-1.5 min-w-0">
            <MessageSquare className="w-4 h-4 text-primary shrink-0" />
            <h2 className="text-sm font-semibold truncate">{title}</h2>
            <span className="text-xs text-muted-foreground shrink-0">
              ({conversations.length})
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="关闭抽屉"
            title="关闭（Esc）"
          >
            <X className="w-4 h-4" />
          </Button>
        </header>

        {mindmapTitle && (
          <p className="px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border truncate">
            当前图谱：<span className="text-foreground/80">{mindmapTitle}</span>
          </p>
        )}

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-4 py-10 gap-2 text-muted-foreground">
              <MessageSquare className="w-6 h-6 opacity-40" />
              <p className="text-xs">未关联任何会话</p>
              <p className="text-[11px] opacity-70 leading-relaxed">
                打开一个会话后，在右侧面板点击「关联当前」即可加入
              </p>
              {emptyAction}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => (
                <li
                  key={c.id}
                  className="group/drawer-item flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted/60 text-xs"
                >
                  <span
                    className={cn(
                      'truncate flex-1',
                      c.archived && 'text-muted-foreground/50 italic',
                    )}
                    title={c.title}
                  >
                    {c.title}
                    {c.id === activeConversationId && (
                      <span className="ml-1 text-muted-foreground/70">(当前)</span>
                    )}
                  </span>
                  <button
                    type="button"
                    aria-label={`取消关联「${c.title}」`}
                    title="取消关联"
                    onClick={() => onUnlink(c.id)}
                    className="opacity-0 group-hover/drawer-item:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-destructive"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
