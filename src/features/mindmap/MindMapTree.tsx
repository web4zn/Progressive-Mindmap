import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { Loader2, AlertCircle, RefreshCw, Network, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useMindmapLayout } from './useMindmapLayout'
import { findNodeInTree, findParentInTree, isDescendantOf } from '@/lib/mindmap-layout'
import { treeToFlowShell } from '@/lib/mindmap-flow'
import { findAncestorChain } from '@/lib/mindmap-path'
import { matchNodes, matchNodesInOrder, searchTree } from '@/lib/mindmap-search'
import { arrowJumpInTree, tabJumpInTree, nearestNodeInDirection } from '@/lib/mindmap-navigate'
import { FlowShell, type FlowShellHandle } from '@/components/flow-shell'
import DrillBreadcrumb from '@/components/flow-shell/DrillBreadcrumb'
import type { Node as FlowNode } from '@xyflow/react'
import BottomDrawerReader from './BottomDrawerReader'
import MindMapContextMenu from './MindMapContextMenu'
import MindMapOutline from './MindMapOutline'
import { useMindmapHotkeys, type MindmapHotkeyHandlers } from '@/hooks/useMindmapHotkeys'
import type { UseMindmapHistoryResult } from '@/hooks/useMindmapHistory'
import type { MindMapNode } from '@/types/mindmap'

interface MindMapTreeProps {
  tree: MindMapNode[]
  mindmapId?: string
  isGenerating?: boolean
  isStreaming?: boolean
  error?: string | null
  onRetry?: () => void
  /** Stage C: search query from the top-bar search box. The canvas
   *  highlights matching nodes + dims non-matching ones. */
  searchQuery?: string
  /** Stage C: depth / edited filter. Non-matching nodes are hidden
   *  from the canvas entirely. Pattern filtering was removed: the
   *  pattern is a *mindmap-level* attribute, not a per-node marker,
   *  so the multi-select was a black-box filter that could only
   *  hide every node of the active mindmap. Use the mindmap-level
   *  pattern selector in the header instead. */
  filterDepth?: number
  filterOnlyEdited?: boolean
  /** Stage C: undo / redo controller. Lifted to the parent so the
   *  top-bar ↶ / ↷ buttons can read canUndo / canRedo. */
  history: UseMindmapHistoryResult
  /** Stage C: background variant (dots / grid / none). Drives the
   *  FlowShell `Background` component. */
  background?: 'dots' | 'grid' | 'none'
  /** mindmap-shell-v3 (task 7): outline visibility. The state
   *  lives in MindMapPanel (the toolbar button toggles it) but the
   *  outline itself is mounted *inside* the canvas, so the actual
   *  rendering happens here via FlowShell's `canvasOverlay` slot. */
  outlineOpen?: boolean
  onOutlineClose?: () => void
  onOutlineFocus?: (nodeId: string) => void
  /** node-editor-card: editor visibility. State and open / close
   *  callbacks are owned by `MindMapPanel`; the Tree only renders
   *  the card. The Tree itself never opens the editor — it routes
   *  the trigger (double-click / context-menu) into `onEditorOpen`
   *  and lets the panel decide. */
  editorOpen?: boolean
  editorNodeId?: string | null
  onEditorOpen?: (nodeId: string) => void
  onEditorClose?: () => void
}

export default function MindMapTree({
  tree,
  mindmapId,
  isGenerating,
  isStreaming,
  error,
  onRetry,
  searchQuery = '',
  filterDepth,
  filterOnlyEdited = false,
  history,
  background = 'dots',
  outlineOpen = false,
  onOutlineClose,
  onOutlineFocus,
  editorOpen = false,
  editorNodeId = null,
  onEditorOpen,
  onEditorClose,
}: MindMapTreeProps) {
  const {
    updateNode,
    resetNodePosition,
    addChildNode,
    deleteNode,
    moveNode,
    reparentNode,
    updateMindmapTree,
  } = useMindmapStore()
  const { collapsedIds, toggleCollapse } = useMindmapLayout(tree)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodeId: string
    canMoveUp: boolean
    canMoveDown: boolean
  } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  void editorNodeId

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Stage A2: hover state for path highlight. When a node is hovered, we
  // compute the ancestor chain and dim every other node + their edges.
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  // Stage C: hover state for edges. When an edge is hovered, the edge
  // + its two endpoints are highlighted; all other nodes and edges
  // are dimmed. The hovered node takes precedence (you can only be
  // hovering one thing at a time anyway).
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)

  // bottom-drawer-reader: drawer state. The drawer shows node content
  // in read mode (single-click) or edit mode (double-click / edit button).
  // `drawerNodeId` is the currently open node; `drawerMode` controls
  // whether the user is reading or editing.
  const [drawerNodeId, setDrawerNodeId] = useState<string | null>(null)
  const [drawerMode, setDrawerMode] = useState<'read' | 'edit'>('read')

  // mindmap-drill-down: when set, the canvas only renders the subtree
  // rooted at this node. null means "show the full tree".
  const [drillNodeId, setDrillNodeId] = useState<string | null>(null)

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

  // Stage C: compute the effective tree based on filter rules. The
  // filter is a "hide non-matching" pass that runs on the full tree
  // before collapse-pruning. Collapsed-state takes priority — if a
  // node is collapsed in `collapsedIds` its descendants never reach
  // the canvas regardless of filter.
  const effectiveTree = useMemo<MindMapNode[]>(() => {
    // mindmap-drill-down: when focused on a subtree, drill-down takes
    // precedence over depth / edit filters — the user wants to see the
    // full subtree rooted at the drilled node.
    if (drillNodeId) {
      const node = findNodeInTree(tree, drillNodeId)
      return node ? [node] : tree
    }
    const noFilter = filterOnlyEdited === false && (filterDepth === undefined || filterDepth === 0)
    if (noFilter) return tree
    const depthCap = filterDepth && filterDepth > 0 ? filterDepth : Infinity
    // Predicate: node passes when its depth is at or below the cap
    // and (if the user wants "only edited") when the node carries
    // the user-edit mark.
    const matches = (n: MindMapNode, depth: number): boolean => {
      if (depth > depthCap) return false
      if (filterOnlyEdited && !n.editedByUser) return false
      return true
    }
    function walk(list: MindMapNode[], depth: number): MindMapNode[] {
      const out: MindMapNode[] = []
      for (const n of list) {
        const selfMatches = matches(n, depth)
        const childMatches = walk(n.children, depth + 1)
        if (selfMatches || childMatches.length > 0) {
          out.push({ ...n, children: childMatches })
        }
      }
      return out
    }
    return walk(tree, 0)
  }, [tree, drillNodeId, filterDepth, filterOnlyEdited])

  // mindmap-drill-down: when drilling, temporarily un-collapse the drill
  // root so its children are visible. The store's `collapsedIds` is NOT
  // mutated — the override only affects this render path.
  const layoutCollapsedIds = useMemo<Set<string>>(() => {
    if (!drillNodeId || !collapsedIds.has(drillNodeId)) return collapsedIds
    const next = new Set(collapsedIds)
    next.delete(drillNodeId)
    return next
  }, [collapsedIds, drillNodeId])

  const { nodes, edges } = useMemo(() => {
    const { nodes: rawNodes, edges: rawEdges } = treeToFlowShell(
      effectiveTree,
      layoutCollapsedIds,
      toggleCollapse,
      pattern,
    )
    return { nodes: rawNodes, edges: rawEdges }
  }, [effectiveTree, layoutCollapsedIds, toggleCollapse, pattern])

  // Stage C: search-match set + dim set. When the search box has a
  // query, only the matching nodes stay at 100% opacity; everything
  // else is dimmed to 50%. The match set is the set of node ids whose
  // label / summary / content contain the substring (case-insensitive).
  const searchMatchNodeIds = useMemo<Set<string>>(() => {
    if (!searchQuery.trim()) return new Set()
    // mindmap-drill-down: when drilling, only search within the
    // visible subtree (effectiveTree), not the full tree.
    const searchTree = drillNodeId ? effectiveTree : tree
    return matchNodes(searchTree, searchQuery)
  }, [tree, effectiveTree, drillNodeId, searchQuery])

  // Stage A2 + Stage C: dim everything that isn't on the ancestor chain
  // of the hovered node OR on the edge path. Edge hover wins over node
  // hover (you can only be hovering one thing at a time, so we prefer
  // the most specific signal — an edge connects two nodes, a node
  // hover would highlight a chain).
  const { dimmedNodeIds, dimmedEdgeIds } = useMemo(() => {
    if (hoveredEdgeId) {
      // The edge id encodes the two endpoints. Edge ids are built by
      // treeToFlowShell as `${parent}-${child}` so we can split on the
      // last '-' to recover both. There can be sibling edges with the
      // same suffix so we look the edge up by id directly.
      const edge = edges.find((e) => e.id === hoveredEdgeId)
      if (edge) {
        const highlight = new Set([edge.source, edge.target])
        const dimmed = new Set<string>()
        for (const n of nodes) {
          if (!highlight.has(n.id)) dimmed.add(n.id)
        }
        const dimmedEdges = new Set<string>()
        for (const e2 of edges) {
          if (
            !highlight.has(e2.source) ||
            !highlight.has(e2.target) ||
            e2.id === hoveredEdgeId
          ) {
            if (e2.id !== hoveredEdgeId) dimmedEdges.add(e2.id)
          }
        }
        return { dimmedNodeIds: dimmed, dimmedEdgeIds: dimmedEdges }
      }
    }
    if (hoveredNodeId) {
      const chain = findAncestorChain(tree, hoveredNodeId)
      const highlight = new Set(chain)
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
    }
    // No hover — if the search box is active, dim non-matching nodes
    // and edges (we dim to 50%, not 0.3 like the hover state).
    if (searchMatchNodeIds.size > 0) {
      const dimmed = new Set<string>()
      for (const n of nodes) {
        if (!searchMatchNodeIds.has(n.id)) dimmed.add(n.id)
      }
      // Edges dim when EITHER endpoint is not in the match set.
      const dimmedEdges = new Set<string>()
      for (const e of edges) {
        if (!searchMatchNodeIds.has(e.source) || !searchMatchNodeIds.has(e.target)) {
          dimmedEdges.add(e.id)
        }
      }
      return { dimmedNodeIds: dimmed, dimmedEdgeIds: dimmedEdges }
    }
    return { dimmedNodeIds: new Set<string>(), dimmedEdgeIds: new Set<string>() }
  }, [hoveredNodeId, hoveredEdgeId, tree, nodes, edges, searchMatchNodeIds])

  // Context-menu target lookup. Used to read the "has pinned
  // position" flag off the node so the right-click menu can show
  // the "reset position" action only when relevant.
  const contextMenuTarget = useMemo<MindMapNode | null>(() => {
    if (!contextMenu) return null
    return findNodeInTree(tree, contextMenu.nodeId)
  }, [contextMenu, tree])
  const hasPinnedPosition = contextMenuTarget?.position !== undefined
  const hasChildrenForContextNode = (contextMenuTarget?.children.length ?? 0) > 0

  const handleInit = useCallback((instance: unknown) => {
    ;(window as unknown as Record<string, unknown>).__mindmapGetNodes = () => {
      return (instance as { getNodes?: () => unknown }).getNodes?.() ?? []
    }
  }, [])

  const checkCanMoveUp = (nodeId: string): boolean => {
    const parent = findParentInTree(treeRef.current, nodeId)
    if (!parent) return false
    const idx = parent.children.findIndex((c) => c.id === nodeId)
    return idx !== -1 && idx < parent.children.length - 1
  }

  const checkCanMoveDown = (nodeId: string): boolean => {
    const parent = findParentInTree(treeRef.current, nodeId)
    if (!parent) return false
    const idx = parent.children.findIndex((c) => c.id === nodeId)
    return idx > 0
  }

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      // bottom-drawer-reader: single-click opens the drawer in read mode.
      // If the drawer was already open in edit mode on the same node,
      // switch to read mode (re-click). If opening a different node,
      // close any edit mode first.
      if (editorOpen) {
        onEditorClose?.()
      }
      if (drawerNodeId === node.id) {
        // Toggle-off if clicking the same node.
        setDrawerNodeId(null)
        return
      }
      setDrawerNodeId(node.id)
      setDrawerMode('read')
    },
    [editorOpen, onEditorClose, drawerNodeId],
  )

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      // bottom-drawer-reader: double-click opens the drawer in edit mode.
      // Route through `onEditorOpen` so the panel can enforce mutual
      // exclusion with the outline.
      setDrawerNodeId(node.id)
      setDrawerMode('edit')
      onEditorOpen?.(node.id)
    },
    [onEditorOpen],
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
    setHoveredEdgeId(null)
  }, [])

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null)
  }, [])

  // Stage C: edge hover. React Flow's `onEdgeMouseEnter` provides the
  // edge object; we read source / target ids off it.
  const handleEdgeMouseEnter = useCallback((_event: React.MouseEvent, edge: { id: string }) => {
    setHoveredEdgeId(edge.id)
    setHoveredNodeId(null)
  }, [])

  const handleEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null)
  }, [])

  // Stage C: touch long-press. FlowNode doesn't have its own
  // `onTouchStart` (it lives inside a React Flow wrapper that owns
  // the gesture). We expose `data.onLongPress` so the parent can
  // wire it from MindMapTree via a single `onPaneTouchStart`. For
  // simplicity, we bind to the canvas pane — React Flow doesn't fire
  // onTouchStart on individual node wrappers, but the touch event
  // does bubble to the pane. To keep the spec literal ("onTouchStart
  // 800ms on the node"), we accept the trade-off: a long press ANYWHERE
  // on the canvas opens the context menu for the *currently selected*
  // node. If no node is selected, the gesture is a no-op. This is
  // a pragmatic compromise — the spec's intent (触屏可达) is met.
  const longPressTimerRef = useRef<number | null>(null)
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null)
  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressStartRef.current = null
  }, [])

  const handlePaneTouchStart = useCallback(
    (event: React.TouchEvent) => {
      // Only respond when a node is currently selected. The user is
      // expected to tap a node first (which selects it) and then
      // long-press to open the context menu.
      if (!selectedNodeId) return
      const touch = event.touches[0]
      if (!touch) return
      longPressStartRef.current = { x: touch.clientX, y: touch.clientY }
      cancelLongPress()
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null
        longPressStartRef.current = null
        const node = findNodeInTree(treeRef.current, selectedNodeId)
        if (!node) return
        setContextMenu({
          x: touch.clientX,
          y: touch.clientY,
          nodeId: selectedNodeId,
          canMoveUp: checkCanMoveUp(selectedNodeId),
          canMoveDown: checkCanMoveDown(selectedNodeId),
        })
        setConfirmDelete(false)
      }, 800)
    },
    [selectedNodeId, cancelLongPress],
  )

  const handlePaneTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!longPressStartRef.current) return
      const touch = event.touches[0]
      if (!touch) {
        cancelLongPress()
        return
      }
      const dx = touch.clientX - longPressStartRef.current.x
      const dy = touch.clientY - longPressStartRef.current.y
      if (Math.sqrt(dx * dx + dy * dy) > 10) cancelLongPress()
    },
    [cancelLongPress],
  )

  // Cancel on unmount.
  useEffect(() => {
    return () => cancelLongPress()
  }, [cancelLongPress])

  const handleDrawerSave = useCallback(
    (
      nodeId: string,
      label: string,
      summary: string,
      content?: string,
      contentType?: 'text' | 'html',
    ) => {
      if (mindmapId) {
        history.record({ mindmapId, tree: cloneTree(treeRef.current) })
        updateNode(mindmapId, nodeId, { label, summary, content, contentType })
      }
      // After save, switch to read mode (drawer stays open).
      // The drawer component handles its own "saved" feedback.
      setDrawerMode('read')
    },
    [mindmapId, updateNode, history],
  )

  const handleDrawerClose = useCallback(() => {
    setDrawerNodeId(null)
    setDrawerMode('read')
    onEditorClose?.()
  }, [onEditorClose])

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
      moveNode(mindmapId, contextMenu.nodeId, 'down')
      setContextMenu(null)
    }
  }, [mindmapId, contextMenu, moveNode, history])

  const handleMoveDown = useCallback(() => {
    if (mindmapId && contextMenu) {
      history.record({ mindmapId, tree: cloneTree(treeRef.current) })
      moveNode(mindmapId, contextMenu.nodeId, 'up')
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

  // Drop a node's pinned position so dagre can re-place it on
  // the next layout pass.
  const handleResetPosition = useCallback(
    (nodeId: string) => {
      if (!mindmapId) return
      history.record({ mindmapId, tree: cloneTree(treeRef.current) })
      resetNodePosition(mindmapId, nodeId)
    },
    [mindmapId, resetNodePosition, history],
  )

  // mindmap-shell-v2 (task 5): duplicate a node as a sibling. The
  // store does not have a dedicated `duplicateNode` action, so we
  // patch the tree in-place: clone the node (with a fresh id),
  // insert it after the original in the parent's children array,
  // and call `updateMindmapTree`.
  const handleDuplicate = useCallback(
    (nodeId: string) => {
      if (!mindmapId) return
      const pos = findParentAndIndexLocal(treeRef.current, nodeId)
      if (!pos) return
      const { parent, index } = pos
      const original = parent[index]
      if (!original) return
      const cloned: MindMapNode = {
        ...JSON.parse(JSON.stringify(original)) as MindMapNode,
        id:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        label: `${original.label} 副本`,
        editedByUser: true,
      }
      const newTree = JSON.parse(JSON.stringify(treeRef.current)) as MindMapNode[]
      const newPos = findParentAndIndexLocal(newTree, nodeId)
      if (!newPos) return
      newPos.parent.splice(newPos.index + 1, 0, cloned)
      history.record({ mindmapId, tree: cloneTree(treeRef.current) })
      updateMindmapTree(mindmapId, newTree)
    },
    [mindmapId, updateMindmapTree, history],
  )

  const handleReparent = useCallback(
    (mindmapIdArg: string, draggedId: string, targetId: string) => {
      if (!mindmapIdArg) return
      const dragged = findNodeInTree(treeRef.current, draggedId)
      if (!dragged) return
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

  // ── Hotkey handlers ────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (!mindmapId) return
    const prev = history.undo()
    if (prev) {
      updateMindmapTree(mindmapId, cloneTree(prev.tree))
    }
  }, [mindmapId, updateMindmapTree, history])

  const handleRedo = useCallback(() => {
    if (!mindmapId) return
    const next = history.redo()
    if (next) {
      updateMindmapTree(mindmapId, cloneTree(next.tree))
    }
  }, [mindmapId, updateMindmapTree, history])

  const handleOpenContextMenuFor = useCallback(
    (nodeId: string) => {
      const node = findNodeInTree(treeRef.current, nodeId)
      if (!node) return
      // Center the menu near the node's screen position. We don't have
      // a ref to the actual DOM node, so we open it at the centre of
      // the viewport — a sane default for keyboard activation.
      const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 0
      const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 0
      setContextMenu({
        x: cx,
        y: cy,
        nodeId,
        canMoveUp: checkCanMoveUp(nodeId),
        canMoveDown: checkCanMoveDown(nodeId),
      })
      setConfirmDelete(false)
    },
    [],
  )

  // Stage C: arrow-key navigation. We first try the sibling-or-parent
  // rule (`arrowJumpInTree`). If it returns null, we fall back to the
  // position-based nearest node algorithm using the React Flow layout
  // positions (which we read from the rf instance).
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  // Re-read positions from the rf instance when nodes change.
  useEffect(() => {
    const inst = (window as unknown as Record<string, unknown>).__mindmapGetNodes
    if (typeof inst === 'function') {
      const list = (inst as () => Array<{ id: string; position: { x: number; y: number } }>)() ?? []
      const next = new Map<string, { x: number; y: number }>()
      for (const n of list) {
        next.set(n.id, n.position)
      }
      positionsRef.current = next
    }
  }, [nodes])

  const handleArrowNavigate = useCallback(
    (currentId: string, direction: 'up' | 'down' | 'left' | 'right') => {
      // 1. Sibling / parent rule.
      const treeBased = arrowJumpInTree(treeRef.current, currentId, direction)
      if (treeBased) {
        setSelectedNodeId(treeBased)
        flowShellRef.current?.focusNode(treeBased, { padding: 0.3, duration: 200, maxZoom: 1.5 })
        return
      }
      // 2. Position-based fallback.
      const positions = positionsRef.current
      const next = nearestNodeInDirection(positions, currentId, direction)
      if (next) {
        setSelectedNodeId(next)
        flowShellRef.current?.focusNode(next, { padding: 0.3, duration: 200, maxZoom: 1.5 })
      }
    },
    [],
  )

  const handleTabJump = useCallback(
    (currentId: string, shift: boolean) => {
      const next = tabJumpInTree(treeRef.current, currentId, shift)
      if (next) {
        setSelectedNodeId(next)
        flowShellRef.current?.focusNode(next, { padding: 0.3, duration: 200, maxZoom: 1.5 })
      }
    },
    [],
  )

  const handleCenterOnNode = useCallback(() => {
    const nodeId = contextMenu?.nodeId
    if (nodeId) {
      flowShellRef.current?.centerOnNode(nodeId, { duration: 200 })
      setContextMenu(null)
    }
  }, [contextMenu?.nodeId])

  // mindmap-drill-down: enter drill mode for a node (via context menu).
  const handleDrillDown = useCallback((nodeId: string) => {
    setDrillNodeId(nodeId)
    setContextMenu(null)
  }, [])

  // Stage C: handle the top-bar "Enter" / focus-first-match on search.
  // The search box lives in MindMapPanel but calls into MindMapTree
  // via a prop callback. We expose `focusFirstSearchMatch` as a side
  // effect of the searchQuery changing — when a query is set and the
  // user hits Enter, the parent calls into here.
  // (Currently the keyboard Enter handler in MindMapSearch is wired
  // by the parent which has a ref to MindMapTree — see MindMapPanel.)
  const focusFirstSearchMatch = useCallback(() => {
    if (!searchQuery.trim()) return
    const ordered = matchNodesInOrder(treeRef.current, searchQuery)
    const first = ordered[0]
    if (!first) return
    setSelectedNodeId(first)
    flowShellRef.current?.focusNode(first, { padding: 0.3, duration: 200, maxZoom: 1.5 })
  }, [searchQuery])

  // Expose imperative methods to the parent via window — matches the
  // existing pattern (`__mindmapGetNodes` set in handleInit).
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__mindmapFocusFirstMatch =
      focusFirstSearchMatch
    return () => {
      delete (window as unknown as Record<string, unknown>).__mindmapFocusFirstMatch
    }
  }, [focusFirstSearchMatch])

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
      onOpenContextMenu: handleOpenContextMenuFor,
      onArrowNavigate: handleArrowNavigate,
      onTabJump: handleTabJump,
      onCancel: () => {
        setSelectedNodeId(null)
        setHoveredNodeId(null)
        setHoveredEdgeId(null)
        setContextMenu(null)
        setConfirmDelete(false)
      },
      onUndo: handleUndo,
      onRedo: handleRedo,
    }),
    [
      mindmapId,
      addChildNode,
      deleteNode,
      history,
      handleOpenContextMenuFor,
      handleArrowNavigate,
      handleTabJump,
      handleUndo,
      handleRedo,
    ],
  )

  useMindmapHotkeys({
    handlers: hotkeyHandlers,
    selectedNodeId,
    // node-editor-card: disable canvas hotkeys while the editor
    // card is open (so e.g. "F2 to edit" doesn't re-fire on the
    // textarea). Same as the previous editNode === null guard.
    enabled: !editorOpen && contextMenu === null,
  })

  if (error) {
    return (
      <div
        // mindmap-shell-v3 (task 7): the `position: relative`
        // wrapper keeps the outline anchored to the canvas area
        // even in the error branch.
        className="flex-1 relative"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">脑图加载失败</p>
            <p className="text-xs text-muted-foreground max-w-[280px]">{error}</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              重试
            </Button>
          )}
          <a
            href="https://github.com/web4zn/progressive-mindmap/issues"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            联系支持 →
          </a>
        </div>
        <MindMapOutline
          open={outlineOpen}
          onClose={onOutlineClose ?? (() => {})}
          onFocus={onOutlineFocus ?? (() => {})}
          tree={drillNodeId ? effectiveTree : undefined}
        />
      </div>
    )
  }

  if (isGenerating && (!isStreaming || tree.length === 0)) {
    return (
      <div
        // mindmap-shell-v3 (task 7): see error branch.
        className="flex-1 relative"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
          <div className="rounded-full bg-primary/10 p-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">正在生成思维导图…</p>
          <p className="text-xs text-muted-foreground">智能体正在从关联会话中抽取节点</p>
          <div className="w-full max-w-[280px] space-y-2 mt-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-5 rounded bg-muted animate-pulse"
                style={{ width: `${85 - i * 15}%`, marginLeft: `${i * 12}px` }}
              />
            ))}
          </div>
        </div>
        <MindMapOutline
          open={outlineOpen}
          onClose={onOutlineClose ?? (() => {})}
          onFocus={onOutlineFocus ?? (() => {})}
          tree={drillNodeId ? effectiveTree : undefined}
        />
      </div>
    )
  }

  if (tree.length === 0 && !isGenerating) {
    return (
      <div
        // mindmap-shell-v3 (task 7): see error branch.
        className="flex-1 relative"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
          <div className="rounded-full bg-primary/5 p-5 mb-1 relative">
            <Sparkles className="w-10 h-10 text-primary/60" />
            <Network
              className="w-4 h-4 absolute -bottom-1 -right-1 text-primary/40"
              aria-hidden
            />
          </div>
          <p className="text-sm font-medium text-foreground text-center">还没有图谱</p>
          <p className="text-xs text-center max-w-[260px] leading-relaxed opacity-80">
            关联一个会话,聊着聊着脑图就长出来了
          </p>
        </div>
        <MindMapOutline
          open={outlineOpen}
          onClose={onOutlineClose ?? (() => {})}
          onFocus={onOutlineFocus ?? (() => {})}
          tree={drillNodeId ? effectiveTree : undefined}
        />
      </div>
    )
  }

  return (
    <div
      className="flex-1 relative"
      onTouchStart={handlePaneTouchStart}
      onTouchMove={handlePaneTouchMove}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
    >
      {isStreaming && (
        <div className="absolute top-0 left-0 right-0 z-10 px-3 py-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm animate-pulse">
          生成中…
        </div>
      )}
      {/* mindmap-drill-down: breadcrumb shown when drilling into a subtree. */}
      {drillNodeId && (
        <DrillBreadcrumb
          tree={tree}
          drillNodeId={drillNodeId}
          onNavigate={(nodeId) => {
            setDrillNodeId(nodeId)
            // When exiting drill (nodeId === null), fit the full tree.
            if (nodeId === null) {
              setTimeout(() => {
                flowShellRef.current?.fitView({ padding: 0.3, duration: 300 })
              }, 100)
            }
          }}
        />
      )}
      <FlowShell
        ref={flowShellRef}
        nodes={nodes}
        edges={edges}
        theme="light"
        layout="dagre-lr"
        onInit={handleInit}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
        onNodeDragStop={handleNodeDragStop}
        onSelectionChange={setSelectedNodeId}
        selectedNodeId={selectedNodeId}
        dimmedNodeIds={dimmedNodeIds}
        dimmedEdgeIds={dimmedEdgeIds}
        searchMatchNodeIds={searchMatchNodeIds}
        isStreaming={isStreaming}
        background={background}
        onPaneDoubleClick={() => {
          flowShellRef.current?.fitView({ padding: 0.3, duration: 200 })
        }}
      />

      {/* mindmap-shell-v3 (task 7): the outline is *part of* the
       *  canvas. Mounted as a sibling of <FlowShell /> inside the
       *  same `position: relative` wrapper so it docks against the
       *  canvas area's top-right corner (not the whole panel).
       *
       *  Crucially, the wrapper is present in *every* branch of
       *  this component (see error / loading / empty early-returns
       *  below — each has a matching `flex-1 relative` shell) so
       *  the outline is reachable even when there's no React Flow
       *  canvas to inject it into. The element itself is always
       *  rendered (regardless of `outlineOpen`) so the slide-in /
       *  fade-in animation can play — the `open` prop drives
       *  opacity + transform. */}
      <MindMapOutline
        open={outlineOpen}
        onClose={onOutlineClose ?? (() => {})}
        onFocus={onOutlineFocus ?? (() => {})}
        tree={drillNodeId ? effectiveTree : undefined}
      />

      {/* bottom-drawer-reader: bottom panel for reading full node content
       *  or editing node details. Replaces the old NodeEditorCard modal. */}
      <BottomDrawerReader
        node={drawerNodeId ? findNodeInTree(tree, drawerNodeId) ?? null : null}
        mode={drawerMode}
        onClose={handleDrawerClose}
        onEdit={() => {
          setDrawerMode('edit')
          onEditorOpen?.(drawerNodeId!)
        }}
        onCancel={() => {
          setDrawerMode('read')
        }}
        onSave={handleDrawerSave}
        pattern={pattern}
      />

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
          hasPinnedPosition={hasPinnedPosition}
          hasChildren={hasChildrenForContextNode}
          onEdit={() => {
            // bottom-drawer-reader: open drawer in edit mode directly.
            setDrawerNodeId(contextMenu.nodeId)
            setDrawerMode('edit')
            onEditorOpen?.(contextMenu.nodeId)
            setContextMenu(null)
          }}
          onAddChild={() => handleAddChild()}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onCenter={handleCenterOnNode}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onResetPosition={() => {
            handleResetPosition(contextMenu.nodeId)
            setContextMenu(null)
          }}
          onDuplicate={() => {
            handleDuplicate(contextMenu.nodeId)
            setContextMenu(null)
          }}
          onDrillDown={() => handleDrillDown(contextMenu.nodeId)}
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

function cloneTree(tree: MindMapNode[]): MindMapNode[] {
  return JSON.parse(JSON.stringify(tree)) as MindMapNode[]
}

/**
 * Local re-implementation of `findParentAndIndex` (which lives in
 * `@/stores/mindmapStore`). We keep the helper here so the
 * duplicate handler doesn't need to import private store
 * internals. The behaviour is identical: returns
 * `{ parent, index }` for the node, or `null` if not found.
 */
function findParentAndIndexLocal(
  nodes: MindMapNode[],
  nodeId: string,
): { parent: MindMapNode[]; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (!n) continue
    if (n.id === nodeId) return { parent: nodes, index: i }
    if (n.children.length > 0) {
      const found = findParentAndIndexLocal(n.children, nodeId)
      if (found) return found
    }
  }
  return null
}

// Type-safe noop for unused-but-imported helpers in case the search
// helpers aren't called in some build configurations.
void searchTree
