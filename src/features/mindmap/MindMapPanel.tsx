import { useCallback, useMemo, useState } from 'react'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useConversationStore } from '@/stores/conversationStore'
import { useChatStore } from '@/stores/chatStore'
import { exportMindmapAsMarkdown, downloadMarkdown } from '@/lib/export'
import { exportMindmapAsPng, exportMindmapAsSvg } from '@/lib/export-mindmap'
import MindMapTree from '@/features/mindmap/MindMapTree'
import MindMapHeader, { type MindMapPattern } from '@/features/mindmap/MindMapHeader'
import MindMapDrawer from '@/features/mindmap/MindMapDrawer'
import type { MindMap } from '@/types/mindmap'
import type { MindMapNode } from '@/types/mindmap'

interface MindMapPanelProps {
  onClose: () => void
}

/**
 * Stage B: top-level container. The body is now just the header
 * (3-section grid) + the canvas. Linked-conversation lives in a
 * slide-out drawer (MindMapDrawer) so the canvas can keep its full
 * height.
 */
export default function MindMapPanel({ onClose }: MindMapPanelProps) {
  const mindmaps = useMindmapStore((s) => s.mindmaps)
  const activeMindmapId = useMindmapStore((s) => s.activeMindmapId)
  const setActiveMindmapId = useMindmapStore((s) => s.setActiveMindmapId)
  const updateMindmap = useMindmapStore((s) => s.updateMindmap)
  const removeMonitoredConversation = useMindmapStore((s) => s.removeMonitoredConversation)

  // Subscribe to the conversation list — zustand will only fire
  // re-renders when the reference changes (add/remove). For inner
  // mutations (message appended) the reference stays stable.
  const conversations = useConversationStore((s) => s.conversations)
  const activeConvId = useConversationStore((s) => s.activeConversationId)
  const agentStatus = useChatStore((s) => s.agentStatus)
  const isAgentActive = agentStatus !== 'idle'

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

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

      <MindMapTree
        tree={activeMindmap?.tree ?? []}
        mindmapId={activeMindmapId ?? undefined}
        isGenerating={isAgentActive}
        isStreaming={isAgentActive && (activeMindmap?.tree.length ?? 0) > 0}
        error={null}
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
