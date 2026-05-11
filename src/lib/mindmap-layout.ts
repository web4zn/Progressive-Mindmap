import dagre from '@dagrejs/dagre'
import type { MindMapNode } from '../types/mindmap'
import type { MindMapFlowNode, MindMapFlowEdge, MindMapNodeData } from '../features/mindmap/types'

const nodeWidth = 200
const nodeHeight = 80
const richNodeHeight = 380

export function treeToFlow(
  nodes: MindMapNode[],
  collapsedIds: Set<string> = new Set(),
): { nodes: MindMapFlowNode[]; edges: MindMapFlowEdge[] } {
  const flowNodes: MindMapFlowNode[] = []
  const flowEdges: MindMapFlowEdge[] = []

  function walk(list: MindMapNode[], parentId: string | null) {
    for (const n of list) {
      const hasChildren = n.children.length > 0
      const isCollapsed = collapsedIds.has(n.id)

      const data: MindMapNodeData = {
        label: n.label,
        summary: n.summary,
        content: n.content,
        contentType: n.contentType,
        editedByUser: n.editedByUser,
        hasChildren,
        collapsed: isCollapsed,
      }

      flowNodes.push({
        id: n.id,
        type: 'mindmap',
        position: { x: 0, y: 0 },
        data,
      })

      if (parentId) {
        flowEdges.push({
          id: `${parentId}-${n.id}`,
          source: parentId,
          target: n.id,
          type: 'mindmap',
        })
      }

      if (!isCollapsed) {
        walk(n.children, n.id)
      }
    }
  }

  walk(nodes, null)
  return { nodes: flowNodes, edges: flowEdges }
}

export function applyLayout(
  nodes: MindMapFlowNode[],
  edges: MindMapFlowEdge[],
): { nodes: MindMapFlowNode[]; edges: MindMapFlowEdge[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 180, edgesep: 30, marginx: 80, marginy: 80 })

  for (const n of nodes) {
    const hasRichContent = n.data?.contentType === 'html' && n.data?.content
    g.setNode(n.id, {
      width: nodeWidth,
      height: hasRichContent ? richNodeHeight : nodeHeight,
    })
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  const layoutedNodes = nodes.map((n) => {
    const pos = g.node(n.id)
    if (!pos) return n
    const hasRich = n.data?.contentType === 'html' && n.data?.content
    const h = hasRich ? richNodeHeight : nodeHeight
    return {
      ...n,
      position: { x: pos.x - nodeWidth / 2, y: pos.y - h / 2 },
    }
  })

  return { nodes: layoutedNodes, edges }
}

export function getLayoutedFlow(
  tree: MindMapNode[],
  collapsedIds: Set<string> = new Set(),
): { nodes: MindMapFlowNode[]; edges: MindMapFlowEdge[] } {
  const { nodes, edges } = treeToFlow(tree, collapsedIds)
  return applyLayout(nodes, edges)
}

export function findNodeInTree(nodes: MindMapNode[], id: string): MindMapNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findNodeInTree(n.children, id)
    if (found) return found
  }
  return null
}

export function findParentInTree(nodes: MindMapNode[], id: string): MindMapNode | null {
  for (const n of nodes) {
    for (const c of n.children) {
      if (c.id === id) return n
    }
    const found = findParentInTree(n.children, id)
    if (found) return found
  }
  return null
}

export function isDescendantOf(ancestor: MindMapNode, targetId: string): boolean {
  for (const child of ancestor.children) {
    if (child.id === targetId) return true
    if (isDescendantOf(child, targetId)) return true
  }
  return false
}
