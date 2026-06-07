import { useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Stage C — search box. Renders a single input that filters nodes by
 * label / summary / content (case-insensitive substring match) and
 * drives a "highlight matches + dim non-matches" view in the canvas.
 *
 * The box is purely presentational — the parent owns the `query`
 * state, the matching logic lives in `lib/mindmap-search.ts`, and
 * the canvas dim/highlight lives in MindMapTree. The component
 * also implements the spec's Enter / Esc semantics:
 *   - Enter: jump to the first match (parent callback)
 *   - Esc: clear the query
 */
export interface MindMapSearchProps {
  query: string
  onQueryChange: (query: string) => void
  /** Optional count of current matches — shown as a small badge. */
  matchCount?: number
  /** Called when the user hits Enter. The parent decides what
   *  "focus first match" means (typically `flowShellRef.focusNode`). */
  onEnter?: () => void
  /** When true, render as a compact input (used inside a tight
   *  top-bar layout). Default: false. */
  compact?: boolean
  className?: string
}

export default function MindMapSearch({
  query,
  onQueryChange,
  matchCount,
  onEnter,
  compact,
  className,
}: MindMapSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={cn(
        'relative inline-flex items-center',
        compact ? 'w-44' : 'w-56',
        className,
      )}
      data-testid="mindmap-search"
    >
      <Search
        className="absolute left-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="搜索节点…"
        aria-label="搜索节点"
        title="搜索 label / summary / content"
        className={cn(
          'w-full pl-7 pr-12 h-7 rounded-md border border-input bg-background text-xs font-medium',
          'placeholder:text-muted-foreground/70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        )}
        onChange={(e) => {
          onQueryChange(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter?.()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onQueryChange('')
            inputRef.current?.blur()
          }
        }}
      />
      <div className="absolute right-1.5 flex items-center gap-1">
        {typeof matchCount === 'number' && query.trim() && (
          <span
            className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-medium bg-primary/15 text-primary"
            aria-label={`${matchCount} 个匹配`}
          >
            {matchCount}
          </span>
        )}
        {query && (
          <button
            type="button"
            aria-label="清空搜索"
            title="清空（Esc）"
            className="p-0.5 rounded text-muted-foreground hover:text-foreground"
            onClick={() => {
              onQueryChange('')
              inputRef.current?.focus()
            }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}
