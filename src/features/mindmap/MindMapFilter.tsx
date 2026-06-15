import { cn } from '@/lib/utils'

/**
 * Depth filter — a bare range slider, no trigger, no popover.
 *
 * The earlier revisions wrapped the slider in a button + popover
 * pair (Stage C), then surfaced that pair on the toolbar inside
 * a "more" dropdown. Both indirections turned out to be
 * friction: the user always wants to *see* the slider position,
 * not click once to reveal it, and the popover added no real
 * affordance beyond the slider itself. Now the slider sits
 * inline on the toolbar — what you see is what you drag.
 *
 * The `onlyEdited` field is still carried on the value object
 * for backward compatibility with persisted data, but the UI
 * no longer renders any control for it. New state is always
 * `onlyEdited: false` (see `DEFAULTS` in callers).
 */

export interface MindMapFilterValue {
  /** Maximum depth to display. 0 = "any depth" (unlimited). */
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
}

export default function MindMapFilter({ value, onChange }: MindMapFilterProps) {
  const active = value.maxDepth > 0
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors',
        active && 'bg-accent/60',
      )}
      data-testid="mindmap-filter"
    >
      <span
        className={cn(
          'text-[11px] tabular-nums w-7 text-right transition-colors',
          active ? 'text-foreground font-medium' : 'text-muted-foreground',
        )}
        data-testid="mindmap-filter-value"
      >
        {value.maxDepth === 0 ? '不限' : value.maxDepth}
      </span>
      <input
        type="range"
        min={0}
        max={5}
        step={1}
        value={value.maxDepth}
        onChange={(e) =>
          onChange({ ...value, maxDepth: Number(e.target.value) })
        }
        className="w-20 accent-primary cursor-pointer"
        aria-label="最大深度"
        title="最大深度"
        data-testid="mindmap-filter-depth"
      />
    </div>
  )
}
