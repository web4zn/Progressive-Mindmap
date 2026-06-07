import { useMemo, useState } from 'react'
import { X, ListTree, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { selectNodeIcon } from '@/lib/node-icon'
import type { MindMapNode } from '@/types/mindmap'
import { useMindmapStore } from '@/stores/mindmapStore'
import { cn } from '@/lib/utils'

/**
 * Stage C — outline / left-side drawer.
 *
 * Slides in from the left of the mindmap panel (280px wide). Shows a
 * tree-shaped list of every node in the active mindmap, with pattern
 * icons + indentation that mirrors the depth. Clicking a row fires
 * the parent's `onFocus` callback (which calls `flowShellRef.focusNode`)
 * and closes the drawer.
 *
 * The list is re-derived from the active mindmap on every store
 * change so the outline stays in sync with the canvas. The component
 * is presentation-only — it never mutates the tree.
 */

export interface MindMapOutlineProps {
  open: boolean
  onClose: () => void
  onFocus: (nodeId: string) => void
}

interface OutlineRow {
  id: string
  label: string
  pattern: string
  depth: number
  hasChildren: boolean
}

export default function MindMapOutline({ open, onClose, onFocus }: MindMapOutlineProps) {
  const mindmaps = useMindmapStore((s) => s.mindmaps)
  const activeMindmapId = useMindmapStore((s) => s.activeMindmapId)
  const activeMindmap = useMemo(
    () => mindmaps.find((m) => m.id === activeMindmapId) ?? null,
    [mindmaps, activeMindmapId],
  )

  // Collapsed sub-trees (UI-only, component state). Persisted across
  // re-renders but not across the outline being closed & reopened —
  // the user expects the outline to be in the "fully expanded" state
  // every time they open it. We key the local state off `open` so a
  // close-then-open cycle remounts the state implicitly.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set())

  const rows = useMemo<OutlineRow[]>(() => {
    const tree = activeMindmap?.tree ?? []
    const pattern = activeMindmap?.pattern ?? 'auto'
    const out: OutlineRow[] = []
    function walk(list: MindMapNode[], depth: number) {
      for (const n of list) {
        out.push({
          id: n.id,
          label: n.label,
          pattern,
          depth,
          hasChildren: n.children.length > 0,
        })
        if (n.children.length > 0 && !collapsedIds.has(n.id)) {
          walk(n.children, depth + 1)
        }
      }
    }
    walk(tree, 0)
    return out
  }, [activeMindmap?.tree, activeMindmap?.pattern, collapsedIds])

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleClick = (id: string) => {
    onFocus(id)
    onClose()
  }

  return (
    <>
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
        aria-label="脑图大纲"
        aria-hidden={!open}
        data-state={open ? 'open' : 'closed'}
        data-testid="mindmap-outline"
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 max-w-[90vw] bg-popover text-popover-foreground',
          'border-r border-border shadow-xl flex flex-col',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
          <div className="flex items-center gap-1.5 min-w-0">
            <ListTree className="w-4 h-4 text-primary shrink-0" />
            <h2 className="text-sm font-semibold truncate">大纲</h2>
            <span className="text-xs text-muted-foreground shrink-0">({rows.length})</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="关闭大纲"
            title="关闭（Esc）"
          >
            <X className="w-4 h-4" />
          </Button>
        </header>

        {activeMindmap?.title && (
          <p className="px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border truncate">
            当前图谱：<span className="text-foreground/80">{activeMindmap.title}</span>
          </p>
        )}

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-4 py-10 gap-2 text-muted-foreground">
              <ListTree className="w-6 h-6 opacity-40" />
              <p className="text-xs">暂无节点</p>
            </div>
          ) : (
            <ul className="space-y-0.5" data-testid="mindmap-outline-list">
              {rows.map((row) => {
                const icon = selectNodeIcon({ pattern: row.pattern, label: row.label })
                return (
                  <li
                    key={row.id}
                    className="group/outline-item flex items-center gap-1 px-1 py-1 rounded-md hover:bg-muted/60 text-xs"
                    data-testid={`mindmap-outline-row-${row.id}`}
                    style={{ paddingLeft: `${8 + row.depth * 14}px` }}
                  >
                    {row.hasChildren ? (
                      <button
                        type="button"
                        className="shrink-0 p-0.5 -ml-0.5 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleCollapse(row.id)}
                        aria-label={collapsedIds.has(row.id) ? '展开子节点' : '折叠子节点'}
                      >
                        {collapsedIds.has(row.id) ? (
                          <ChevronRight className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    ) : (
                      <span className="w-3 h-3 shrink-0" aria-hidden />
                    )}
                    <button
                      type="button"
                      className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                      onClick={() => handleClick(row.id)}
                      title={row.label}
                    >
                      {icon && (
                        <span className="shrink-0 text-primary" aria-hidden>
                          <OutlineIcon name={icon} />
                        </span>
                      )}
                      <span className="truncate">{row.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}

function OutlineIcon({ name }: { name: ReturnType<typeof selectNodeIcon> }) {
  if (!name) return null
  // We deliberately keep these tiny — the outline is information-dense
  // and a 12px icon is enough to hint at the pattern.
  const common = {
    width: 10,
    height: 10,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'Zap':
      return (
        <svg {...common}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    case 'Scale':
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M5 7h14" />
          <path d="M5 7l-3 7a3 3 0 0 0 6 0L5 7z" />
          <path d="M19 7l-3 7a3 3 0 0 0 6 0L19 7z" />
        </svg>
      )
    case 'User':
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    case 'Lightbulb':
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M15.09 14a5 5 0 1 0-6.18 0" />
        </svg>
      )
    case 'Clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      )
    case 'MapPin':
      return (
        <svg {...common}>
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )
    case 'HelpCircle':
    case 'CircleHelp':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'Circle':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
  }
}
