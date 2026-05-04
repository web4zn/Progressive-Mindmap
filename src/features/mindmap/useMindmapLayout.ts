import { useState, useCallback, useMemo } from 'react'
import type { MindMapNode } from '@/types/mindmap'
import { getLayoutedFlow } from '@/lib/mindmap-layout'
import type { MindMapFlowNode, MindMapFlowEdge } from './types'

export function useMindmapLayout(tree: MindMapNode[]) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  const { nodes, edges } = useMemo(
    () => getLayoutedFlow(tree, collapsedIds),
    [tree, collapsedIds],
  )

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const resetCollapse = useCallback(() => {
    setCollapsedIds(new Set())
  }, [])

  return {
    nodes: nodes as MindMapFlowNode[],
    edges: edges as MindMapFlowEdge[],
    collapsedIds,
    toggleCollapse,
    resetCollapse,
  } as const
}
