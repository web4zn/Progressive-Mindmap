import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useConversationStore } from '@/stores/conversationStore'
import { useChatStore } from '@/stores/chatStore'
import { exportMindmapAsMarkdown, downloadMarkdown } from '@/lib/export'
import { exportMindmapAsPng, exportMindmapAsSvg } from '@/lib/export-mindmap'
import MindMapTree from '@/features/mindmap/MindMapTree'
import MindMapHeader, { type MindMapPattern } from '@/features/mindmap/MindMapHeader'
import MindMapDrawer from '@/features/mindmap/MindMapDrawer'
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
  Sun,
  Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'

type BackgroundVariant = 'dots' | 'grid' | 'none'

/**
 * Stage B + Stage C + Stage D + mindmap-shell-v2 (task 5) +
 * toolbar-flatten pass: top-level container.
 *
 * Toolbar layout (post flatten — no more "more" dropdown):
 *
 *   [Undo] [Redo] | [Outline] [Search] | [Background] [Theme] | [Filter]
 *
 * The earlier v2 grouped Background / Filter / Theme inside a
 * "more" dropdown. User feedback was that the dropdown felt
 * redundant — the three controls are all small, frequently
 * touched, and visually parallel (icon + label). They're now
 * inline; the segmented background switcher and the depth-only
 * filter button retain their popover where the control itself
 * is multi-state.
 *
 * Stage D — global theme (light / dark / system). The hook is
 * mounted here (not in App.tsx) because the toggle button lives
 * in the panel's toolbar; any other component can still read the
 * current theme from `document.documentElement.dataset.theme`.
 */
export default function MindMapPanel() {
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
  // node-editor-card (Stage mindmap-shell-v3+): editor card
  // state. The editor and the outline are mutually exclusive —
  // they both anchor to the canvas's top-right corner, so they
  // cannot be visible at the same time. MindMapPanel owns the
  // state machine (see `openEditor` / `toggleOutline`).
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorNodeId, setEditorNodeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<MindMapFilterValue>({
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

  // node-editor-card: open the editor for a specific node and
  // close the outline at the same time. Both panels anchor to
  // the canvas's top-right corner, so the strict mutual exclusion
  // is enforced here in a single setState batch — they flip in
  // the same render and only one card is visible at a time.
  const openEditor = useCallback((nodeId: string) => {
    setEditorNodeId(nodeId)
    setEditorOpen(true)
    setOutlineOpen(false)
  }, [])

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
    setEditorNodeId(null)
  }, [])

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
    : // The `relative` anchor is load-bearing — the in-panel side
      // columns (outline, drawer) position themselves with
      // `absolute` against this container. Without `relative` they
      // would escape into the chat canvas.
      'relative h-full flex flex-col border-l bg-sidebar text-sidebar-foreground'

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
      />

      {/* mindmap-shell-v2 (task 5): consolidated toolbar.
       *
       *  Visible (4): Undo / Redo / Outline / Search
       *  Inside "more" dropdown (3): Filter / Background / Theme
       *
       * The search box and outline toggle stay in the primary
       * bar because users hit them the most (per the Stage C
       * usage telemetry). Filter, background, and theme are
       * surfaced in a `DropdownMenu` — they still appear in
       * discoverable places (the dropdown trigger is a generic
       * ⋯ button) but the row itself stays compact. */}
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
          onClick={() => {
            // node-editor-card: outline and editor are mutually
            // exclusive. If the editor is open, treat the click as
            // "switch to outline" (close editor, open outline).
            // Otherwise toggle as before.
            if (editorOpen) {
              closeEditor()
              setOutlineOpen(true)
            } else {
              setOutlineOpen((o) => !o)
            }
          }}
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

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Background switcher — 3-way segmented control
            (dots / grid / none). Pinned inline so the user can
            see the current variant at a glance instead of
            having to open a "more" menu (the v2 dropdown
            hidden all three of these together; user feedback
            was that the dropdown felt redundant). */}
        <div
          role="radiogroup"
          aria-label="画布背景"
          data-testid="background-switcher"
          className="inline-flex items-center rounded-md border border-input bg-background p-0.5"
        >
          {(
            [
              { value: 'dots', icon: Grid3x3, label: '点阵背景' },
              { value: 'grid', icon: Grid2x2, label: '网格背景' },
              { value: 'none', icon: Square, label: '无背景' },
            ] as const
          ).map(({ value, icon: Icon, label }) => {
            const active = background === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={label}
                title={label}
                onClick={() => setBackground(value)}
                data-testid={`background-switcher-${value}`}
                className={cn(
                  'inline-flex items-center justify-center w-6 h-6 rounded transition-colors outline-none',
                  'focus-visible:ring-2 focus-visible:ring-ring/40',
                  active
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            )
          })}
        </div>

        {/* Theme toggle — single button, Sun in dark mode
            (suggests "switch to light") and Moon in light
            mode. Pinned inline for the same discoverability
            reason as the background switcher. */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? '切换到浅色' : '切换到深色'}
          aria-pressed={theme === 'dark'}
          title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
          data-testid="mindmap-toolbar-theme-toggle"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </Button>

        <div className="w-px h-4 bg-border mx-0.5" />

        {/* Depth-only filter. The previously-also-exposed
            "only-edited" checkbox was removed (user feedback:
            too narrow, never useful). See `MindMapFilter`. */}
        <MindMapFilter value={filter} onChange={setFilter} />
      </div>

      <MindMapTree
        tree={activeMindmap?.tree ?? []}
        mindmapId={activeMindmapId ?? undefined}
        isGenerating={isAgentActive}
        isStreaming={isAgentActive && (activeMindmap?.tree.length ?? 0) > 0}
        error={null}
        searchQuery={searchQuery}
        filterDepth={filter.maxDepth}
        filterOnlyEdited={filter.onlyEdited}
        history={history}
        background={background}
        // mindmap-shell-v3 (task 7): the outline is mounted inside
        // the canvas via FlowShell's `canvasOverlay` slot (see
        // MindMapTree). MindMapPanel still owns the toggle state
        // and passes it through so the toolbar button keeps
        // working unchanged.
        outlineOpen={outlineOpen}
        onOutlineClose={() => setOutlineOpen(false)}
        onOutlineFocus={handleOutlineFocus}
        // node-editor-card: editor state and callbacks. The Tree
        // mounts <NodeEditorCard> at the top-right of the canvas
        // and routes right-click / double-click into `onEditorOpen`.
        // The Tree never opens the editor itself — only the panel
        // can flip the state.
        editorOpen={editorOpen}
        editorNodeId={editorNodeId}
        onEditorOpen={openEditor}
        onEditorClose={closeEditor}
      />

      <MindMapDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mindmapTitle={activeMindmap?.title}
        conversations={linkedConversations}
        activeConversationId={activeConvId}
        onUnlink={handleUnlink}
      />
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
