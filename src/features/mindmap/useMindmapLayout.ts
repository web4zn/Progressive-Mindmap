import { useCallback, useMemo } from 'react'
import type { MindMapNode } from '@/types/mindmap'
import { getLayoutedFlow } from '@/lib/mindmap-layout'
import { useMindmapStore } from '@/stores/mindmapStore'
import type { MindMapFlowNode, MindMapFlowEdge } from './types'

export function useMindmapLayout(tree: MindMapNode[]) {
  const activeMindmapId = useMindmapStore((s) => s.activeMindmapId)
  const collapsedNodeIds = useMindmapStore((s) => {
    if (!s.activeMindmapId) return []
    return s.mindmaps.find((m) => m.id === s.activeMindmapId)?.collapsedNodeIds ?? []
  })
  const setCollapsedNodeIds = useMindmapStore((s) => s.setCollapsedNodeIds)

  const collapsedIds = useMemo(() => new Set(collapsedNodeIds), [collapsedNodeIds])

  const { nodes, edges } = useMemo(
    () => getLayoutedFlow(tree, collapsedIds),
    [tree, collapsedIds],
  )

  const toggleCollapse = useCallback((id: string) => {
    if (!activeMindmapId) return
    const next = new Set(collapsedNodeIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setCollapsedNodeIds(activeMindmapId, [...next])
  }, [collapsedNodeIds, activeMindmapId, setCollapsedNodeIds])

  const resetCollapse = useCallback(() => {
    if (!activeMindmapId) return
    setCollapsedNodeIds(activeMindmapId, [])
  }, [activeMindmapId, setCollapsedNodeIds])

  return {
    nodes: nodes as MindMapFlowNode[],
    edges: edges as MindMapFlowEdge[],
    collapsedIds,
    toggleCollapse,
    resetCollapse,
  } as const
}
