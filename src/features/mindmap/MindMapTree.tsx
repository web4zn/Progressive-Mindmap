import { useCallback, useState, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Loader2, AlertCircle, RefreshCw, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useMindmapLayout } from './useMindmapLayout'
import { findNodeInTree, findParentInTree, isDescendantOf } from '@/lib/mindmap-layout'
import MindMapNodeComponent from './MindMapNodeComponent'
import MindMapEdgeComponent from './MindMapEdgeComponent'
import MindMapEditModal from './MindMapEditModal'
import MindMapContextMenu from './MindMapContextMenu'
import type { MindMapNode } from '@/types/mindmap'
import type { MindMapFlowNode } from './types'

const nodeTypes = { mindmap: MindMapNodeComponent }
const edgeTypes = { mindmap: MindMapEdgeComponent }

interface MindMapTreeProps {
  tree: MindMapNode[]
  mindmapId?: string
  isGenerating?: boolean
  isStreaming?: boolean
  error?: string | null
  onRetry?: () => void
}

export default function MindMapTree({ tree, mindmapId, isGenerating, isStreaming, error, onRetry }: MindMapTreeProps) {
  const { updateNode, addChildNode, deleteNode, moveNode, reparentNode } = useMindmapStore()
  const { nodes: layoutedNodes, edges: layoutedEdges, toggleCollapse } = useMindmapLayout(tree)

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)

  const [editNode, setEditNode] = useState<MindMapNode | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; nodeId: string; canMoveUp: boolean; canMoveDown: boolean
  } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const treeRef = useRef(tree)
  treeRef.current = tree

  useEffect(() => {
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges])

  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__mindmapToggle = toggleCollapse
    return () => {
      delete (window as unknown as Record<string, unknown>).__mindmapToggle
    }
  }, [toggleCollapse])

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

  const handleNodeDoubleClick: NodeMouseHandler<MindMapFlowNode> = useCallback((_, node) => {
    const found = findNodeInTree(treeRef.current, node.id)
    if (found) setEditNode(found)
  }, [])

  const handleNodeContextMenu: NodeMouseHandler<MindMapFlowNode> = useCallback((event, node) => {
    event.preventDefault()
    setContextMenu({
      x: (event as unknown as MouseEvent).clientX,
      y: (event as unknown as MouseEvent).clientY,
      nodeId: node.id,
      canMoveUp: checkCanMoveUp(node.id),
      canMoveDown: checkCanMoveDown(node.id),
    })
    setConfirmDelete(false)
  }, [])

  const handleEditConfirm = useCallback((nodeId: string, label: string, summary: string) => {
    if (mindmapId) updateNode(mindmapId, nodeId, { label, summary })
    setEditNode(null)
  }, [mindmapId, updateNode])

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

  const handleNodeDragStop = useCallback((_: unknown, draggedNode: MindMapFlowNode) => {
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
  }, [mindmapId, reparentNode])

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-destructive text-center">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />重试
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
            <div key={i} className="h-5 rounded bg-muted animate-pulse" style={{ width: `${85 - i * 15}%`, marginLeft: `${i * 12}px` }} />
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
        <p className="text-xs text-center opacity-60">关联对话后点击「更新图谱」从对话中生成内容</p>
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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        deleteKeyCode="Delete"
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeWidth={2} pannable zoomable />
      </ReactFlow>

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
          onClose={() => { setContextMenu(null); setConfirmDelete(false) }}
        />
      )}
    </div>
  )
}
