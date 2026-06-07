import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useConversationStore } from '@/stores/conversationStore'
import { useChatStore } from '@/stores/chatStore'
import { exportMindmapAsMarkdown, downloadMarkdown } from '@/lib/export'
import { exportMindmapAsPng, exportMindmapAsSvg } from '@/lib/export-mindmap'
import MindMapTree from '@/features/mindmap/MindMapTree'
import MindMapHeader, { type MindMapPattern } from '@/features/mindmap/MindMapHeader'
import MindMapDrawer from '@/features/mindmap/MindMapDrawer'
import MindMapOutline from '@/features/mindmap/MindMapOutline'
import MindMapSearch from '@/features/mindmap/MindMapSearch'
import MindMapFilter, { type MindMapFilterValue } from '@/features/mindmap/MindMapFilter'
import { useMindmapHistory } from '@/hooks/useMindmapHistory'
import { matchNodes } from '@/lib/mindmap-search'
import type { MindMap } from '@/types/mindmap'
import type { MindMapNode } from '@/types/mindmap'
import {
  Undo2,
  Redo2,
  ListTree,
  Grid2x2,
  Grid3x3,
  Square,
  Plus,
  Sun,
  Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'

interface MindMapPanelProps {
  onClose: () => void
}

type BackgroundVariant = 'dots' | 'grid' | 'none'

/**
 * Stage B + Stage C: top-level container.
 * - Stage B: header (3-section grid) + canvas + linked-conversation drawer.
 * - Stage C: the header gains:
 *     - ↶ / ↷  buttons (undo / redo from the lifted history)
 *     - 大纲 (ListTree icon → opens the left outline drawer)
 *     - 搜索 box (label / summary / content match)
 *     - 筛选 dropdown (pattern / depth / edited)
 *     - 背景 switcher (3 icons: dots / grid / none)
 *   Plus a left-side outline drawer (MindMapOutline).
 *
 * The lifted `useMindmapHistory` hook lets the top-bar ↶/↷ buttons
 * read canUndo / canRedo without prop-drilling from MindMapTree.
 */
export default function MindMapPanel({ onClose }: MindMapPanelProps) {
  const mindmaps = useMindmapStore((s) => s.mindmaps)
  const activeMindmapId = useMindmapStore((s) => s.activeMindmapId)
  const setActiveMindmapId = useMindmapStore((s) => s.setActiveMindmapId)
  const updateMindmap = useMindmapStore((s) => s.updateMindmap)
  const updateMindmapTree = useMindmapStore((s) => s.updateMindmapTree)
  const removeMonitoredConversation = useMindmapStore((s) => s.removeMonitoredConversation)

  const conversations = useConversationStore((s) => s.conversations)
  const activeConvId = useConversationStore((s) => s.activeConversationId)
  const agentStatus = useChatStore((s) => s.agentStatus)
  const isAgentActive = agentStatus !== 'idle'

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Stage C: top-bar / drawer state
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<MindMapFilterValue>({
    patterns: new Set(),
    maxDepth: 0,
    onlyEdited: false,
  })
  const [background, setBackground] = useState<BackgroundVariant>('dots')

  // Stage D — global theme (light / dark / system). The hook is
  // mounted here (not in App.tsx) because the toggle button lives
  // in the panel's toolbar; any other component can still read the
  // current theme from `document.documentElement.dataset.theme`.
  const { theme, toggle: toggleTheme } = useTheme()

  // Lifted history. The hook is keyed to the active mindmap id, so
  // the timeline resets whenever the user switches mindmaps.
  const history = useMindmapHistory({ capacity: 50 })

  const activeMindmap: MindMap | null = useMemo(
    () => mindmaps.find((m) => m.id === activeMindmapId) ?? null,
    [mindmaps, activeMindmapId],
  )

  const linkedConversations = useMemo(
    () =>
      conversations.filter((c) =>
        activeMindmap?.monitoredConversationIds?.includes(c.id),
      ),
    [conversations, activeMindmap?.monitoredConversationIds],
  )

  const nodeCount = useMemo(
    () => (activeMindmap ? countNodes(activeMindmap.tree) : 0),
    [activeMindmap],
  )

  const searchMatchCount = useMemo(() => {
    if (!searchQuery.trim() || !activeMindmap) return 0
    return matchNodes(activeMindmap.tree, searchQuery).size
  }, [activeMindmap, searchQuery])

  // Stage D — mirror the active mindmap's pattern onto the html
  // element so any component outside the React tree (CSS rules,
  // portals, etc.) can read it via `attr()`. The FlowShell wrapper
  // uses its own `data-pattern` attribute set by the React prop, so
  // this dataset write is purely a global CSS hook.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const pattern = activeMindmap?.pattern ?? 'auto'
    document.documentElement.dataset['pattern'] = pattern
  }, [activeMindmap?.pattern])

  const handleSelect = useCallback(
    (id: string) => setActiveMindmapId(id),
    [setActiveMindmapId],
  )

  const handleRename = useCallback(
    (id: string, title: string) => updateMindmap(id, { title }),
    [updateMindmap],
  )

  const handlePatternChange = useCallback(
    (pattern: MindMapPattern) => {
      if (!activeMindmapId) return
      updateMindmap(activeMindmapId, { pattern })
    },
    [activeMindmapId, updateMindmap],
  )

  const handleUnlink = useCallback(
    (convId: string) => {
      if (activeMindmapId) removeMonitoredConversation(activeMindmapId, convId)
    },
    [activeMindmapId, removeMonitoredConversation],
  )

  const handleExportPng = useCallback(
    (pixelRatio: 1 | 2 | 3) => {
      if (!activeMindmap) return
      exportMindmapAsPng({ pixelRatio, filename: activeMindmap.title })
    },
    [activeMindmap],
  )

  const handleExportSvg = useCallback(() => {
    if (!activeMindmap) return
    exportMindmapAsSvg(activeMindmap.title)
  }, [activeMindmap])

  const handleExportMd = useCallback(() => {
    if (!activeMindmap) return
    const md = exportMindmapAsMarkdown(activeMindmap)
    downloadMarkdown(md, activeMindmap.title)
  }, [activeMindmap])

  const handleUndo = useCallback(() => {
    if (!activeMindmapId) return
    const prev = history.undo()
    if (prev) {
      updateMindmapTree(activeMindmapId, JSON.parse(JSON.stringify(prev.tree)))
    }
  }, [activeMindmapId, history, updateMindmapTree])

  const handleRedo = useCallback(() => {
    if (!activeMindmapId) return
    const next = history.redo()
    if (next) {
      updateMindmapTree(activeMindmapId, JSON.parse(JSON.stringify(next.tree)))
    }
  }, [activeMindmapId, history, updateMindmapTree])

  const handleFocusFirstMatch = useCallback(() => {
    const fn = windowMindmapFocus()
    if (typeof fn === 'function') {
      fn()
    }
  }, [])

  // Stage D — narrowed helper. The bridge from MindMapTree
  // publishes `window.__mindmapFocusFirstMatch` as a 0-arg
  // function; we type the lookup once here so the cast doesn't
  // leak into the rest of the file. Declared at module scope (not
  // inside the component) so the `react-hooks/immutability` lint
  // rule doesn't trip on "use before declare" inside a hook.

  const handleOutlineFocus = useCallback((_nodeId: string) => {
    // The outline already calls `flowShellRef.focusNode` indirectly
    // through MindMapTree. This hook is here for future expansion
    // (e.g. selecting the node after focusing).
  }, [])

  const fullscreenClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col bg-background'
    : 'h-full flex flex-col border-l bg-sidebar text-sidebar-foreground'

  return (
    <div className={fullscreenClass}>
      <MindMapHeader
        mindmaps={mindmaps}
        activeMindmapId={activeMindmapId}
        activeMindmap={activeMindmap}
        nodeCount={nodeCount}
        isAgentActive={isAgentActive}
        isFullscreen={isFullscreen}
        onSelectMindmap={handleSelect}
        onRenameMindmap={handleRename}
        onChangePattern={handlePatternChange}
        onOpenDrawer={() => setDrawerOpen(true)}
        linkedCount={linkedConversations.length}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onExportMd={handleExportMd}
        onToggleFullscreen={() => setIsFullscreen((v) => !v)}
        onClose={onClose}
      />

      {/* Stage C: secondary toolbar — undo / redo / outline / search /
          filter / background. Sits between the header and the canvas
          so the existing 3-section grid structure of the header is
          preserved. */}
      <div
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-b border-sidebar-border bg-background/40"
        data-testid="mindmap-toolbar-stage-c"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleUndo}
          disabled={!history.canUndo}
          title={
            history.canUndo
              ? `撤销（${history.pastDepth ?? ''} 步）`
              : '无可撤销操作'
          }
          aria-label="撤销"
          data-testid="mindmap-toolbar-undo"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleRedo}
          disabled={!history.canRedo}
          title={history.canRedo ? '重做' : '无可重做操作'}
          aria-label="重做"
          data-testid="mindmap-toolbar-redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </Button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Button
          variant={outlineOpen ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={() => setOutlineOpen((o) => !o)}
          title="大纲"
          aria-label="大纲"
          data-testid="mindmap-toolbar-outline"
        >
          <ListTree className="w-3.5 h-3.5" />
        </Button>

        <MindMapSearch
          query={searchQuery}
          onQueryChange={setSearchQuery}
          matchCount={searchMatchCount}
          onEnter={handleFocusFirstMatch}
          compact
        />

        <MindMapFilter value={filter} onChange={setFilter} />

        <div className="w-px h-4 bg-border mx-0.5" />

        <BackgroundSwitcher value={background} onChange={setBackground} />

        {/* Stage D — theme toggle (light ↔ dark). The button shows
            the icon for the *current* theme so a user on light sees
            🌙 (click to go dark) and on dark sees ☀ (click to go
            light). The toggle persists in localStorage via
            `useTheme`. */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
          aria-label={theme === 'dark' ? '切换到浅色' : '切换到深色'}
          aria-pressed={theme === 'dark'}
          data-testid="mindmap-theme-toggle"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>

      <MindMapTree
        tree={activeMindmap?.tree ?? []}
        mindmapId={activeMindmapId ?? undefined}
        isGenerating={isAgentActive}
        isStreaming={isAgentActive && (activeMindmap?.tree.length ?? 0) > 0}
        error={null}
        searchQuery={searchQuery}
        filterPattern={filter.patterns}
        filterDepth={filter.maxDepth}
        filterOnlyEdited={filter.onlyEdited}
        history={history}
        background={background}
      />

      <MindMapDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mindmapTitle={activeMindmap?.title}
        conversations={linkedConversations}
        activeConversationId={activeConvId}
        onUnlink={handleUnlink}
      />

      <MindMapOutline
        open={outlineOpen}
        onClose={() => setOutlineOpen(false)}
        onFocus={handleOutlineFocus}
      />
    </div>
  )
}

/**
 * Stage C: 3-icon background switcher. Dots / Grid / None. State is
 * component-level (not persisted). Wired through the `background` prop
 * on FlowShell which already accepted `Background variant` props.
 */
function BackgroundSwitcher({
  value,
  onChange,
}: {
  value: BackgroundVariant
  onChange: (v: BackgroundVariant) => void
}) {
  const options: { v: BackgroundVariant; icon: React.ReactNode; title: string }[] = [
    { v: 'dots', icon: <Grid3x3 className="w-3.5 h-3.5" />, title: '点阵背景' },
    { v: 'grid', icon: <Grid2x2 className="w-3.5 h-3.5" />, title: '网格背景' },
    { v: 'none', icon: <Square className="w-3.5 h-3.5" />, title: '无背景' },
  ]
  return (
    <div
      className="inline-flex items-center rounded-md border border-input bg-background overflow-hidden"
      data-testid="mindmap-background-switcher"
      role="group"
      aria-label="画布背景"
    >
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          aria-label={o.title}
          title={o.title}
          aria-pressed={value === o.v}
          className={cn(
            'inline-flex items-center justify-center w-7 h-7 transition-colors outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring/40',
            value === o.v
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
          )}
        >
          {o.icon}
        </button>
      ))}
    </div>
  )
}

function countNodes(nodes: MindMapNode[]): number {
  let count = nodes.length
  for (const node of nodes) {
    count += countNodes(node.children)
  }
  return count
}

/**
 * Stage D — typed lookup of the global "focus first search match"
 * bridge. `MindMapTree` publishes `window.__mindmapFocusFirstMatch`
 * as a 0-arg function; we keep the cast localised here so the rest
 * of `MindMapPanel` doesn't see a `Record<string, unknown>` shape.
 */
function windowMindmapFocus(): (() => void) | undefined {
  const w = window as unknown as { __mindmapFocusFirstMatch?: unknown }
  return typeof w.__mindmapFocusFirstMatch === 'function'
    ? (w.__mindmapFocusFirstMatch as () => void)
    : undefined
}

// `Plus` is exported for any future toolbar extension (e.g. "add root")
// — keep the import alive.
void Plus
