import { useState, useRef, useEffect } from 'react'
import { Filter, Check, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Stage C — filter dropdown. Renders a button + popover with:
 *   - 1 checkbox: 已编辑
 *   - a depth slider 0-5
 *
 * Earlier revisions also exposed a "pattern" multi-select (5W1H /
 * tech / pros-cons). The pattern is a *mindmap-level* field, not a
 * per-node attribute — there is no per-node pattern marker in the
 * canvas — so the multi-select was a black-box filter that could
 * only hide every node of the active mindmap. The v2 cleanup drops
 * it entirely; the only way to switch pattern is the mindmap-level
 * selector in the header.
 *
 * The popover body is also exported as `MindMapFilterBody` so
 * callers (e.g. the "more" dropdown in `MindMapPanel`) can embed
 * the same controls inline without the trigger button or the
 * nested popover. Nesting a popover inside a Base UI menu
 * fights with the menu's focus-trap and overflow clipping, so
 * the inline form is the supported pattern for menu embeddings.
 */

export interface MindMapFilterValue {
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

const DEFAULTS: MindMapFilterValue = {
  maxDepth: 0,
  onlyEdited: false,
}

/**
 * The filter controls without any trigger or popover wrapper.
 * Render this directly when the host already provides the
 * surrounding chrome (e.g. inside a `<DropdownMenuContent>`).
 * The host is expected to render its own section title (e.g. a
 * `<DropdownMenuLabel>`), so this component does not draw one —
 * a duplicated title felt noisy in the embedded context.
 */
export function MindMapFilterBody({
  value,
  onChange,
}: Pick<MindMapFilterProps, 'value' | 'onChange'>) {
  function reset() {
    onChange({
      maxDepth: DEFAULTS.maxDepth,
      onlyEdited: DEFAULTS.onlyEdited,
    })
  }

  return (
    <div
      className="space-y-3"
      data-testid="mindmap-filter-body"
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 px-1.5 py-1 rounded">
          <input
            type="checkbox"
            checked={value.onlyEdited}
            onChange={() => onChange({ ...value, onlyEdited: !value.onlyEdited })}
            className="accent-primary"
            data-testid="mindmap-filter-only-edited"
          />
          <span className="flex-1">仅显示已编辑节点</span>
          {value.onlyEdited && <Check className="w-3 h-3 text-primary" aria-hidden />}
        </label>
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
  )
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

  const active = activeProp ?? (value.maxDepth > 0 || value.onlyEdited)

  return (
    <div ref={rootRef} className="relative inline-block" data-testid="mindmap-filter">
      <button
        type="button"
        aria-label="筛选"
        aria-expanded={open}
        title="筛选 深度 / 已编辑"
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
          className="absolute right-0 top-full mt-1 z-50 w-64 rounded-md border border-border bg-popover text-popover-foreground shadow-lg p-3"
          data-testid="mindmap-filter-popover"
        >
          <MindMapFilterBody value={value} onChange={onChange} />
        </div>
      )}
    </div>
  )
}
