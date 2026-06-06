import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { Loader2, AlertCircle, RefreshCw, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useMindmapLayout } from './useMindmapLayout'
import { findNodeInTree, findParentInTree, isDescendantOf } from '@/lib/mindmap-layout'
import { treeToFlowShell } from '@/lib/mindmap-flow'
import { findAncestorChain } from '@/lib/mindmap-path'
import { FlowShell, type FlowShellHandle } from '@/components/flow-shell'
import type { Node as FlowNode } from '@xyflow/react'
import MindMapEditModal from './MindMapEditModal'
import MindMapContextMenu from './MindMapContextMenu'
import { useMindmapHistory } from '@/hooks/useMindmapHistory'
import { useMindmapHotkeys, type MindmapHotkeyHandlers } from '@/hooks/useMindmapHotkeys'
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
  const { updateNode, addChildNode, deleteNode, moveNode, reparentNode, updateMindmapTree } =
    useMindmapStore()
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

  // Stage A2: hover state for path highlight. When a node is hovered, we
  // compute the ancestor chain and dim every other node + their edges.
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // Stage A2: undo / redo for canvas mutations. Collapsing / expanding a
  // node is intentionally NOT recorded (per spec).
  const history = useMindmapHistory({ capacity: 50 })

  // Imperative handle on FlowShell so we can drive `fitView()` / `zoomIn()` /
  // `zoomOut()` / `getIntersectingNodes()` from here. `useReactFlow()`
  // cannot be called from MindMapTree because the ReactFlowProvider only
  // lives inside FlowShell.
  const flowShellRef = useRef<FlowShellHandle | null>(null)

  const treeRef = useRef(tree)

  useEffect(() => {
    treeRef.current = tree
  })

  // Reset the history timeline whenever the active mindmap changes —
  // undoing a snapshot from a different tree is not meaningful and
  // would be confusing to the user.
  useEffect(() => {
    history.clear()
    if (mindmapId) {
      // Seed the timeline with the current tree so the first user edit
      // can be undone back to "what was on screen when I opened this".
      history.record({ mindmapId, tree: cloneTree(tree) })
    }
    // Intentionally only `mindmapId` — re-seeding on every tree change
    // (e.g. streaming nodes in) would erase the user's undo timeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindmapId])

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

  // Stage A2: dim everything that isn't on the ancestor chain of the
  // hovered node. Recomputed on hover change — cheap (linear in tree).
  const { dimmedNodeIds, dimmedEdgeIds } = useMemo(() => {
    if (!hoveredNodeId) {
      return { dimmedNodeIds: new Set<string>(), dimmedEdgeIds: new Set<string>() }
    }
    const chain = findAncestorChain(tree, hoveredNodeId)
    const highlight = new Set(chain)
    // Find the parent of the hovered node so the edge leading *to* the
    // hovered node is part of the chain even if we only have the path.
    // The chain already includes the hovered node, so the edge from
    // chain[i] → chain[i+1] is always on-path.

    const dimmed = new Set<string>()
    for (const n of nodes) {
      if (!highlight.has(n.id)) dimmed.add(n.id)
    }
    const dimmedEdges = new Set<string>()
    for (const e of edges) {
      if (!highlight.has(e.source) || !highlight.has(e.target)) {
        dimmedEdges.add(e.id)
      }
    }
    return { dimmedNodeIds: dimmed, dimmedEdgeIds: dimmedEdges }
  }, [hoveredNodeId, tree, nodes, edges])

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

  const handleNodeMouseEnter = useCallback((_event: React.MouseEvent, node: FlowNode) => {
    setHoveredNodeId(node.id)
  }, [])

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null)
  }, [])

  const handleEditConfirm = useCallback(
    (
      nodeId: string,
      label: string,
      summary: string,
      content?: string,
      contentType?: 'text' | 'html',
    ) => {
      if (mindmapId) {
        // Stage A2: snapshot *before* the edit so undo restores the
        // pre-edit label / summary / content.
        history.record({ mindmapId, tree: cloneTree(treeRef.current) })
        updateNode(mindmapId, nodeId, { label, summary, content, contentType })
      }
      setEditNode(null)
    },
    [mindmapId, updateNode, history],
  )

  const handleAddChild = useCallback(
    (nodeId?: string) => {
      const targetId = nodeId ?? contextMenu?.nodeId
      if (mindmapId && targetId) {
        history.record({ mindmapId, tree: cloneTree(treeRef.current) })
        addChildNode(mindmapId, targetId)
        setContextMenu(null)
      }
    },
    [mindmapId, contextMenu, addChildNode, history],
  )

  const handleMoveUp = useCallback(() => {
    if (mindmapId && contextMenu) {
      history.record({ mindmapId, tree: cloneTree(treeRef.current) })
      moveNode(mindmapId, contextMenu.nodeId, 'up')
      setContextMenu(null)
    }
  }, [mindmapId, contextMenu, moveNode, history])

  const handleMoveDown = useCallback(() => {
    if (mindmapId && contextMenu) {
      history.record({ mindmapId, tree: cloneTree(treeRef.current) })
      moveNode(mindmapId, contextMenu.nodeId, 'down')
      setContextMenu(null)
    }
  }, [mindmapId, contextMenu, moveNode, history])

  const handleDeleteConfirm = useCallback(() => {
    if (mindmapId && contextMenu) {
      history.record({ mindmapId, tree: cloneTree(treeRef.current) })
      deleteNode(mindmapId, contextMenu.nodeId)
      setContextMenu(null)
      setConfirmDelete(false)
    }
  }, [mindmapId, contextMenu, deleteNode, history])

  const handleReparent = useCallback(
    (mindmapIdArg: string, draggedId: string, targetId: string) => {
      if (!mindmapIdArg) return
      const dragged = findNodeInTree(treeRef.current, draggedId)
      if (!dragged) return
      // Disallow reparenting into self / descendants (store has the
      // same check, but we also want to skip the snapshot for no-ops).
      if (targetId) {
        const target = findNodeInTree(treeRef.current, targetId)
        if (!target) return
        if (isDescendantOf(dragged, targetId) || targetId === draggedId) return
        const oldParent = findParentInTree(treeRef.current, draggedId)
        if (oldParent?.id === targetId) return
      } else {
        const oldParent = findParentInTree(treeRef.current, draggedId)
        if (!oldParent) return
      }
      history.record({ mindmapId: mindmapIdArg, tree: cloneTree(treeRef.current) })
      reparentNode(mindmapIdArg, draggedId, targetId)
    },
    [reparentNode, history],
  )

  // Stage A2: drag reparent using React Flow's getIntersectingNodes. The
  // previous hand-rolled getBoundingClientRect math was inaccurate once
  // node sizes became dynamic (A1 #2); the built-in helper uses the same
  // hit-testing as the visual selection.
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: FlowNode) => {
      if (!mindmapId) return
      const intersecting = flowShellRef.current?.getIntersectingNodes(draggedNode.id) ?? []
      const dragged = findNodeInTree(treeRef.current, draggedNode.id)
      if (!dragged) return
      const oldParent = findParentInTree(treeRef.current, draggedNode.id)

      let targetId = ''
      for (const cand of intersecting) {
        if (cand.id === draggedNode.id) continue
        if (oldParent && cand.id === oldParent.id) continue
        if (isDescendantOf(dragged, cand.id)) continue
        targetId = cand.id
        break
      }
      handleReparent(mindmapId, draggedNode.id, targetId)
    },
    [mindmapId, handleReparent],
  )

  // ── Stage A2: hotkey handlers ────────────────────────────────────────
  const hotkeyHandlers = useMemo<MindmapHotkeyHandlers>(
    () => ({
      onFocusSelected: (nodeId) => {
        flowShellRef.current?.focusNode(nodeId, { padding: 0.3, duration: 200, maxZoom: 1.5 })
      },
      onAutoArrange: () => {
        flowShellRef.current?.fitView({ padding: 0.3, duration: 200 })
      },
      onZoomIn: () => flowShellRef.current?.zoomIn(),
      onZoomOut: () => flowShellRef.current?.zoomOut(),
      onDeleteSelected: (nodeId) => {
        if (!mindmapId) return
        history.record({ mindmapId, tree: cloneTree(treeRef.current) })
        deleteNode(mindmapId, nodeId)
      },
      onAddChild: (nodeId) => {
        if (!mindmapId) return
        history.record({ mindmapId, tree: cloneTree(treeRef.current) })
        addChildNode(mindmapId, nodeId)
      },
      onCancel: () => {
        setSelectedNodeId(null)
        setHoveredNodeId(null)
        setContextMenu(null)
        setConfirmDelete(false)
        if (expandedIds.size > 0) setExpandedIds(new Set())
      },
      onUndo: () => {
        if (!mindmapId) return
        const prev = history.undo()
        if (prev) {
          updateMindmapTree(mindmapId, cloneTree(prev.tree))
        }
      },
        onRedo: () => {
          if (!mindmapId) return
          const next = history.redo()
          if (next) {
            updateMindmapTree(mindmapId, cloneTree(next.tree))
          }
        },
    }),
    [mindmapId, addChildNode, deleteNode, updateMindmapTree, history, expandedIds],
  )

  useMindmapHotkeys({
    handlers: hotkeyHandlers,
    selectedNodeId,
    // Suppress canvas hotkeys while a modal is open — the modal has its
    // own keyboard semantics (Esc to close, Enter to confirm).
    enabled: editNode === null && contextMenu === null,
  })

  const handleCenterOnNode = useCallback(() => {
    if (selectedNodeId) {
      flowShellRef.current?.focusNode(selectedNodeId, {
        padding: 0.3,
        duration: 200,
        maxZoom: 1.5,
      })
    }
  }, [selectedNodeId])

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
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onNodeDragStop={handleNodeDragStop}
        onSelectionChange={setSelectedNodeId}
        selectedNodeId={selectedNodeId}
        dimmedNodeIds={dimmedNodeIds}
        dimmedEdgeIds={dimmedEdgeIds}
        isStreaming={isStreaming}
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
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          confirmDelete={confirmDelete}
          onEdit={() => {
            const found = findNodeInTree(treeRef.current, contextMenu.nodeId)
            if (found) setEditNode(found)
            setContextMenu(null)
          }}
          onAddChild={() => handleAddChild()}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onCenter={handleCenterOnNode}
          onUndo={hotkeyHandlers.onUndo}
          onRedo={hotkeyHandlers.onRedo}
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

// ── local helpers ────────────────────────────────────────────────────────

/**
 * Deep-clone the tree before handing it to the history. The store mutates
 * a working copy on the next write, so a snapshot we hand the history
 * must be independent of the live reference. structuredClone would be
 * faster but isn't typed for our node shape in all envs; JSON round-trip
 * is safe and the trees are small (hundreds of nodes max).
 */
function cloneTree(tree: MindMapNode[]): MindMapNode[] {
  return JSON.parse(JSON.stringify(tree)) as MindMapNode[]
}
