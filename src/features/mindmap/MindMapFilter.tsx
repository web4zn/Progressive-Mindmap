import { useState, useRef, useEffect } from 'react'
import { Filter, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Stage C — filter dropdown. Renders a button + popover with:
 *   - 4 checkboxes: 5W1H / tech / pros-cons / 已编辑
 *   - a depth slider 0-5
 *
 * Pattern filtering is mindmap-level (the active mindmap has a
 * single `pattern` value), so the four checkboxes map to:
 *   - 5W1H: pattern === '5w1h'
 *   - tech: pattern === 'tech'
 *   - pros-cons: pattern === 'pros-cons'
 *   - 已编辑: filterOnlyEdited
 *
 * When a single pattern is checked, only matching-pattern mindmaps
 * show their full content (others show nothing — same as no-pattern
 * showing all). In practice the user would uncheck all patterns
 * (or all of them) to "show all". We render the popover as a
 * controlled overlay with a click-outside dismiss.
 */

export interface MindMapFilterValue {
  /** Selected pattern strings. Empty = "any pattern" (no filter). */
  patterns: Set<string>
  /** Maximum depth to display. 0 = "any depth". */
  maxDepth: number
  /** When true, only show nodes where editedByUser is true. */
  onlyEdited: boolean
}

export interface MindMapFilterProps {
  value: MindMapFilterValue
  onChange: (next: MindMapFilterValue) => void
  /** When true, the filter is active (at least one rule is non-default). */
  active?: boolean
}

const PATTERN_OPTIONS = ['5w1h', 'tech', 'pros-cons'] as const

const DEFAULTS: MindMapFilterValue = {
  patterns: new Set(),
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

  const active =
    activeProp ??
    (value.patterns.size > 0 || value.maxDepth > 0 || value.onlyEdited)

  function togglePattern(p: string) {
    const next = new Set(value.patterns)
    if (next.has(p)) next.delete(p)
    else next.add(p)
    onChange({ ...value, patterns: next })
  }

  function reset() {
    onChange({
      patterns: new Set(DEFAULTS.patterns),
      maxDepth: DEFAULTS.maxDepth,
      onlyEdited: DEFAULTS.onlyEdited,
    })
  }

  return (
    <div ref={rootRef} className="relative inline-block" data-testid="mindmap-filter">
      <button
        type="button"
        aria-label="筛选"
        aria-expanded={open}
        title="筛选 pattern / depth / 编辑"
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
          aria-label="筛选选项"
          className="absolute right-0 top-full mt-1 z-50 w-64 rounded-md border border-border bg-popover text-popover-foreground shadow-lg p-3 space-y-3"
          data-testid="mindmap-filter-popover"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">筛选</h3>
            <button
              type="button"
              aria-label="重置筛选"
              title="重置"
              className="p-0.5 rounded text-muted-foreground hover:text-foreground"
              onClick={reset}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Pattern</p>
            <ul className="space-y-1">
              {PATTERN_OPTIONS.map((p) => {
                const checked = value.patterns.has(p)
                return (
                  <li key={p}>
                    <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 px-1.5 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePattern(p)}
                        className="accent-primary"
                        data-testid={`mindmap-filter-pattern-${p}`}
                      />
                      <span className="flex-1">{p}</span>
                      {checked && <Check className="w-3 h-3 text-primary" aria-hidden />}
                    </label>
                  </li>
                )
              })}
              <li>
                <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 px-1.5 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={value.onlyEdited}
                    onChange={() => onChange({ ...value, onlyEdited: !value.onlyEdited })}
                    className="accent-primary"
                    data-testid="mindmap-filter-only-edited"
                  />
                  <span className="flex-1">已编辑</span>
                  {value.onlyEdited && (
                    <Check className="w-3 h-3 text-primary" aria-hidden />
                  )}
                </label>
              </li>
            </ul>
          </div>

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
        </div>
      )}
    </div>
  )
}
