import { useCallback, useMemo } from 'react'
import { useMindmapStore } from '@/stores/mindmapStore'

const EMPTY_ARRAY: string[] = []

/**
 * Collapse state for the active mindmap.
 *
 * This hook used to also run a full dagre layout (`getLayoutedFlow`) whose
 * output no caller read — the canvas runs the layout that actually renders.
 * That was a second layout pass on every tree change; it has been removed.
 */
export function useMindmapLayout() {
  const activeMindmapId = useMindmapStore((s) => s.activeMindmapId)
  const collapsedNodeIds = useMindmapStore((s) => {
    if (!s.activeMindmapId) return EMPTY_ARRAY
    return s.mindmaps.find((m) => m.id === s.activeMindmapId)?.collapsedNodeIds ?? EMPTY_ARRAY
  })
  const setCollapsedNodeIds = useMindmapStore((s) => s.setCollapsedNodeIds)

  const collapsedIds = useMemo(() => new Set(collapsedNodeIds), [collapsedNodeIds])

  const toggleCollapse = useCallback(
    (id: string) => {
      if (!activeMindmapId) return
      const next = new Set(collapsedNodeIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      setCollapsedNodeIds(activeMindmapId, [...next])
    },
    [collapsedNodeIds, activeMindmapId, setCollapsedNodeIds],
  )

  const resetCollapse = useCallback(() => {
    if (!activeMindmapId) return
    setCollapsedNodeIds(activeMindmapId, [])
  }, [activeMindmapId, setCollapsedNodeIds])

  return {
    collapsedIds,
    toggleCollapse,
    resetCollapse,
  } as const
}
