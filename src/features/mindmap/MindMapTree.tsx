import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { Loader2, AlertCircle, RefreshCw, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useMindmapLayout } from './useMindmapLayout'
import { findNodeInTree, findParentInTree, isDescendantOf } from '@/lib/mindmap-layout'
import { treeToFlowShell } from '@/lib/mindmap-flow'
import { FlowShell, type FlowShellHandle } from '@/components/flow-shell'
import type { Node as FlowNode } from '@xyflow/react'
import MindMapEditModal from './MindMapEditModal'
import MindMapContextMenu from './MindMapContextMenu'
import type { MindMapNode } from '@/types/mindmap'

interface MindMapTreeProps {
  tree: MindMapNode[]
  mindmapId?: string
  isGenerating?: boolean
  isStreaming?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function MindMapTree({
  tree,
  mindmapId,
  isGenerating,
  isStreaming,
  error,
  onRetry,
}: MindMapTreeProps) {
  const { updateNode, addChildNode, deleteNode, moveNode, reparentNode } = useMindmapStore()
  const { collapsedIds, toggleCollapse } = useMindmapLayout(tree)

  const [editNode, setEditNode] = useState<MindMapNode | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodeId: string
    canMoveUp: boolean
    canMoveDown: boolean
  } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Stage A1: in-place expand state lives at the tree level (not in store).
  // Refresh = lost. Ctrl/Cmd+double-click still opens the legacy modal.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Imperative handle on FlowShell so we can drive `fitView()` from here
  // (e.g. pane double-click). `useReactFlow()` cannot be called from
  // MindMapTree because the ReactFlowProvider only lives inside FlowShell.
  const flowShellRef = useRef<FlowShellHandle | null>(null)

  const treeRef = useRef(tree)

  useEffect(() => {
    treeRef.current = tree
  })

  const pattern = useMindmapStore((s) => {
    if (!s.activeMindmapId) return 'auto'
    return s.mindmaps.find((m) => m.id === s.activeMindmapId)?.pattern ?? 'auto'
  })

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const { nodes, edges } = useMemo(() => {
    const { nodes: rawNodes, edges: rawEdges } = treeToFlowShell(
      tree,
      collapsedIds,
      toggleCollapse,
      pattern,
    )
    // Apply in-place expand flag without rebuilding the tree.
    if (expandedIds.size > 0) {
      for (const n of rawNodes) {
        if (expandedIds.has(n.id)) {
          n.data.expanded = true
        }
      }
    }
    return { nodes: rawNodes, edges: rawEdges }
  }, [tree, collapsedIds, toggleCollapse, pattern, expandedIds])

  const handleInit = useCallback((instance: unknown) => {
    ;(window as unknown as Record<string, unknown>).__mindmapGetNodes = () => {
      return (instance as { getNodes?: () => unknown }).getNodes?.() ?? []
    }
  }, [])

  const checkCanMoveUp = (nodeId: string): boolean => {
    const parent = findParentInTree(treeRef.current, nodeId)
    if (!parent) return false
    const idx = parent.children.findIndex((c) => c.id === nodeId)
    return idx > 0
  }

  const checkCanMoveDown = (nodeId: string): boolean => {
    const parent = findParentInTree(treeRef.current, nodeId)
    if (!parent) return false
    const idx = parent.children.findIndex((c) => c.id === nodeId)
    return idx !== -1 && idx < parent.children.length - 1
  }

  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      // Ctrl/Cmd + double-click preserves the legacy modal path.
      if (event.ctrlKey || event.metaKey) {
        const found = findNodeInTree(treeRef.current, node.id)
        if (found) setEditNode(found)
        return
      }
      // Plain double-click toggles in-place expand state.
      toggleExpand(node.id)
    },
    [toggleExpand],
  )

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: FlowNode) => {
      event.preventDefault()
      setContextMenu({
        x: (event as unknown as MouseEvent).clientX,
        y: (event as unknown as MouseEvent).clientY,
        nodeId: node.id,
        canMoveUp: checkCanMoveUp(node.id),
        canMoveDown: checkCanMoveDown(node.id),
      })
      setConfirmDelete(false)
    },
    [],
  )

  const handleEditConfirm = useCallback(
    (
      nodeId: string,
      label: string,
      summary: string,
      content?: string,
      contentType?: 'text' | 'html',
    ) => {
      if (mindmapId) updateNode(mindmapId, nodeId, { label, summary, content, contentType })
      setEditNode(null)
    },
    [mindmapId, updateNode],
  )

  const handleAddChild = useCallback(() => {
    if (mindmapId && contextMenu) {
      addChildNode(mindmapId, contextMenu.nodeId)
      setContextMenu(null)
    }
  }, [mindmapId, contextMenu, addChildNode])

  const handleMoveUp = useCallback(() => {
    if (mindmapId && contextMenu) {
      moveNode(mindmapId, contextMenu.nodeId, 'up')
      setContextMenu(null)
    }
  }, [mindmapId, contextMenu, moveNode])

  const handleMoveDown = useCallback(() => {
    if (mindmapId && contextMenu) {
      moveNode(mindmapId, contextMenu.nodeId, 'down')
      setContextMenu(null)
    }
  }, [mindmapId, contextMenu, moveNode])

  const handleDeleteConfirm = useCallback(() => {
    if (mindmapId && contextMenu) {
      deleteNode(mindmapId, contextMenu.nodeId)
      setContextMenu(null)
      setConfirmDelete(false)
    }
  }, [mindmapId, contextMenu, deleteNode])

  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: FlowNode) => {
      if (!mindmapId) return

      const currentTree = treeRef.current
      const draggedId = draggedNode.id

      const dragged = findNodeInTree(currentTree, draggedId)
      if (!dragged) return

      const oldParent = findParentInTree(currentTree, draggedId)

      for (const candidate of currentTree) {
        if (candidate.id === draggedId) continue
        if (oldParent && candidate.id === oldParent.id) continue
        if (isDescendantOf(dragged, candidate.id)) continue

        const candidateEl = document.querySelector(`[data-id="${candidate.id}"]`)
        if (!candidateEl) continue

        const { top, bottom, left, right } = candidateEl.getBoundingClientRect()

        if (
          draggedNode.position.x >= left - 20 &&
          draggedNode.position.x <= right + 20 &&
          draggedNode.position.y >= top - 20 &&
          draggedNode.position.y <= bottom + 20
        ) {
          reparentNode(mindmapId, draggedId, candidate.id)
          return
        }
      }

      if (oldParent) {
        reparentNode(mindmapId, draggedId, '')
      }
    },
    [mindmapId, reparentNode],
  )

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-destructive text-center">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            重试
          </Button>
        )}
      </div>
    )
  }

  if (isGenerating && (!isStreaming || tree.length === 0)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">正在生成思维导图...</p>
        <div className="w-full space-y-2 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-5 rounded bg-muted animate-pulse"
              style={{ width: `${85 - i * 15}%`, marginLeft: `${i * 12}px` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (tree.length === 0 && !isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
        <Network className="w-10 h-10 opacity-30" />
        <p className="text-sm text-center">此图谱暂无内容</p>
        <p className="text-xs text-center opacity-60">关联会话后脑图随对话自动生长</p>
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      {isStreaming && (
        <div className="absolute top-0 left-0 right-0 z-10 px-3 py-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm animate-pulse">
          生成中…
        </div>
      )}
      <FlowShell
        ref={flowShellRef}
        nodes={nodes}
        edges={edges}
        theme="light"
        layout="dagre-lr"
        onInit={handleInit}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeDragStop={handleNodeDragStop}
        onSelectionChange={setSelectedNodeId}
        selectedNodeId={selectedNodeId}
        onPaneDoubleClick={() => {
          // Pane double-click spec: reset the viewport to fit the whole
          // graph (Stage A1 §10). We also clear any in-place expansion so
          // the reset feels complete — opening a node in-place is meant
          // to be ephemeral and the user has just signalled "back to
          // overview".
          flowShellRef.current?.fitView({ padding: 0.3, duration: 200 })
          if (expandedIds.size > 0) setExpandedIds(new Set())
        }}
      />

      {editNode && (
        <MindMapEditModal
          node={editNode}
          onConfirm={handleEditConfirm}
          onCancel={() => setEditNode(null)}
        />
      )}

      {contextMenu && (
        <MindMapContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          canMoveUp={contextMenu.canMoveUp}
          canMoveDown={contextMenu.canMoveDown}
          confirmDelete={confirmDelete}
          onEdit={() => {
            const found = findNodeInTree(treeRef.current, contextMenu.nodeId)
            if (found) setEditNode(found)
            setContextMenu(null)
          }}
          onAddChild={handleAddChild}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDeleteRequest={() => setConfirmDelete(true)}
          onDeleteConfirm={handleDeleteConfirm}
          onCancelDelete={() => setConfirmDelete(false)}
          onClose={() => {
            setContextMenu(null)
            setConfirmDelete(false)
          }}
        />
      )}
    </div>
  )
}
