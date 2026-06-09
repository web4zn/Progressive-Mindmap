import { useState, useRef, useEffect } from 'react'
import { Filter, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Stage C — filter popover. Originally also exposed a "已编辑"
 * (only-edited) checkbox next to the depth slider. That option
 * was removed in the toolbar-flatten pass (the onlyEdited filter
 * proved too narrow to be useful — most users either want the
 * whole tree or a depth-clipped subset, and the `editedByUser`
 * marker is rarely the deciding axis). The `onlyEdited` field
 * is kept on the value object for backward compatibility with
 * persisted data, but the UI no longer renders a control for
 * it and the reset() helper only ever sets it back to `false`.
 *
 * The toolbar surface that hosts the trigger is owned by
 * `MindMapPanel`; this file just provides the button + popover
 * pair.
 */

export interface MindMapFilterValue {
  /** Maximum depth to display. 0 = "any depth". */
  maxDepth: number
  /**
   * Kept for forward compatibility with persisted filter
   * values; the UI no longer exposes a control for it. New
   * state should always be `false`.
   */
  onlyEdited: boolean
}

export interface MindMapFilterProps {
  value: MindMapFilterValue
  onChange: (next: MindMapFilterValue) => void
  /** When true, the filter is active (at least one rule is non-default). */
  active?: boolean
}

const DEFAULTS: MindMapFilterValue = {
  maxDepth: 0,
  onlyEdited: false,
}

export default function MindMapFilter({
  value,
  onChange,
  active: activeProp,
}: MindMapFilterProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Click-outside dismiss. Bound at the document level so the user can
  // click anywhere outside the popover.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Only `maxDepth` is user-controllable now; `onlyEdited` lives
  // on the value object but never leaves its default.
  const active = activeProp ?? value.maxDepth > 0

  function reset() {
    onChange({
      maxDepth: DEFAULTS.maxDepth,
      onlyEdited: DEFAULTS.onlyEdited,
    })
  }

  return (
    <div ref={rootRef} className="relative inline-block" data-testid="mindmap-filter">
      <button
        type="button"
        aria-label="筛选深度"
        aria-expanded={open}
        title="筛选深度"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center justify-center w-7 h-7 rounded-md border border-input bg-background',
          'hover:bg-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
          active && 'border-primary text-primary',
        )}
      >
        <Filter className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="筛选深度"
          className="absolute right-0 top-full mt-1 z-50 w-64 rounded-md border border-border bg-popover text-popover-foreground shadow-lg p-3"
          data-testid="mindmap-filter-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="space-y-3"
            data-testid="mindmap-filter-body"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] text-muted-foreground">最大深度</p>
                <span className="text-[11px] font-medium text-foreground">
                  {value.maxDepth === 0 ? '不限' : value.maxDepth}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={value.maxDepth}
                onChange={(e) =>
                  onChange({ ...value, maxDepth: Number(e.target.value) })
                }
                className="w-full accent-primary"
                aria-label="最大深度"
                data-testid="mindmap-filter-depth"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                <span>0</span>
                <span>5</span>
              </div>
            </div>
            <button
              type="button"
              aria-label="重置筛选"
              title="重置"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={reset}
              data-testid="mindmap-filter-reset"
            >
              <RotateCcw className="w-3 h-3" />
              重置
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
