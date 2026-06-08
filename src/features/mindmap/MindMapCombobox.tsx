import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Check, Pencil } from 'lucide-react'
import { Popover } from '@base-ui/react/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { MindMap } from '@/types/mindmap'

/**
 * Stage B: graph selector. Replaces the plain `<Select>` from Stage A2
 * with a search-box + inline-rename flow. The whole component is
 * controlled by its parent — we just dispatch `onSelect` and
 * `onRename` callbacks.
 *
 * Why not `cmdk`? The spec allowed `cmdk` *or* "react-popper + 自写".
 * `cmdk` would be ~12kb gz and a new dep; this is ~140 lines of
 * hand-rolled popover code that we already have base-ui primitives
 * for. The UX (search → arrow-key → Enter to select, Esc to close,
 * hover-reveal pencil to rename) matches what users expect from
 * Linear/Notion.
 */
export interface MindMapComboboxProps {
  mindmaps: MindMap[]
  /** `null` means "no mindmap selected" (empty state in the parent). */
  value: string | null
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  /** Optional className for the trigger button. */
  className?: string
  /** When true, the search field is auto-focused when the popover opens. */
  autoFocusSearch?: boolean
  /** Disable the entire control (e.g. while a creation is in flight). */
  disabled?: boolean
}

export default function MindMapCombobox({
  mindmaps,
  value,
  onSelect,
  onRename,
  className,
  autoFocusSearch = true,
  disabled = false,
}: MindMapComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const renameInputRef = useRef<HTMLInputElement | null>(null)

  const selected = useMemo(
    () => mindmaps.find((m) => m.id === value) ?? null,
    [mindmaps, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mindmaps
    return mindmaps.filter((m) => m.title.toLowerCase().includes(q))
  }, [mindmaps, query])

  // Reset highlight + query whenever the menu re-opens. The base-ui
  // popover doesn't expose an `onOpenChange` we can hook, so we
  // subscribe to the open transition via a custom event handler on
  // the trigger wrapper. The cheapest correct option is to compute
  // a clamped highlight inline (no effect).
  const clampedHighlight =
    highlightedIndex >= filtered.length ? Math.max(0, filtered.length - 1) : highlightedIndex

  // Auto-select text when the rename input mounts.
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  function commitRename() {
    if (!renamingId) return
    const next = renameDraft.trim()
    if (next) {
      onRename(renamingId, next)
    }
    setRenamingId(null)
    setRenameDraft('')
  }

  function startRename(id: string, currentTitle: string) {
    setRenamingId(id)
    setRenameDraft(currentTitle)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(filtered.length === 0 ? 0 : (clampedHighlight + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(
        filtered.length === 0 ? 0 : (clampedHighlight - 1 + filtered.length) % filtered.length,
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filtered[clampedHighlight]
      if (target) {
        onSelect(target.id)
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      if (renamingId) {
        // First Esc cancels the rename; second Esc closes the popover.
        e.preventDefault()
        setRenamingId(null)
        setRenameDraft('')
      } else {
        e.preventDefault()
        setOpen(false)
      }
    }
  }

  // Open-close reset is done by mounting the popup body with a
  // key derived from `open` — when open flips false → true, the
  // popup remounts with a fresh `query=''` / `highlightedIndex=0` /
  // `renamingId=null`. This avoids the `setState in effect` warning
  // and is the React team's recommended pattern for "reset state
  // when a controlled prop changes" (see https://react.dev/learn/
  // you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes).
  const popupKey = open ? 'open' : 'closed'

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        // Reset transient state on every close→open transition.
        if (!open && next) {
          setQuery('')
          setHighlightedIndex(0)
          setRenamingId(null)
        }
        setOpen(next)
      }}
      modal={false}
    >
      <Popover.Trigger
        disabled={disabled}
        aria-label="选择图谱"
        className={cn(
          'group flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-input bg-background text-sm font-medium',
          'hover:bg-muted/60 transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
          'disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] max-w-[260px]',
          className,
        )}
      >
        <span className="truncate flex-1 text-left">
          {selected ? selected.title : '选择图谱…'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          key={popupKey}
          side="bottom"
          align="start"
          sideOffset={4}
          className="isolate z-50 outline-none"
        >
          <Popover.Popup
            data-slot="mindmap-combobox"
            className="z-50 w-72 origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none p-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <div className="px-1 pb-2">
              <Input
                ref={searchInputRef}
                autoFocus={autoFocusSearch}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索图谱…"
                className="h-7 text-xs"
                aria-label="搜索图谱"
              />
            </div>

            <div
              role="listbox"
              className="max-h-64 overflow-y-auto"
              onKeyDown={handleKeyDown}
            >
              {filtered.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  {mindmaps.length === 0 ? '暂无图谱' : '没有匹配的图谱'}
                </div>
              ) : (
                filtered.map((m, idx) => {
                  const isSelected = m.id === value
                  const isHighlighted = idx === clampedHighlight
                  const isRenaming = renamingId === m.id
                  return (
                    <div
                      key={m.id}
                      role="option"
                      aria-selected={isSelected}
                      data-highlighted={isHighlighted || undefined}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => {
                        if (isRenaming) return
                        onSelect(m.id)
                        setOpen(false)
                      }}
                      onDoubleClick={(e) => {
                        e.preventDefault()
                        startRename(m.id, m.title)
                      }}
                      className={cn(
                        'group/row flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-xs',
                        isHighlighted && 'bg-accent text-accent-foreground',
                        !isHighlighted && 'hover:bg-muted/60',
                      )}
                    >
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              commitRename()
                            } else if (e.key === 'Escape') {
                              e.preventDefault()
                              setRenamingId(null)
                              setRenameDraft('')
                            }
                          }}
                          onBlur={commitRename}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-background border border-input rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-primary/40 text-xs"
                        />
                      ) : (
                        <>
                          <span className="truncate flex-1" title={m.title}>
                            {m.title}
                          </span>
                          <button
                            type="button"
                            aria-label={`重命名「${m.title}」`}
                            onClick={(e) => {
                              e.stopPropagation()
                              startRename(m.id, m.title)
                            }}
                            className="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-foreground"
                            title="重命名（双击行也可以）"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          )}
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            {query && (
              <div className="border-t border-border mt-1 pt-1 px-1 text-[10px] text-muted-foreground">
                <kbd className="px-1 rounded bg-muted">↵</kbd> 选择
                <span className="mx-1.5">·</span>
                <kbd className="px-1 rounded bg-muted">↑↓</kbd> 移动
                <span className="mx-1.5">·</span>
                <kbd className="px-1 rounded bg-muted">Esc</kbd> 关闭
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
