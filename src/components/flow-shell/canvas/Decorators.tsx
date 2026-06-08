/**
 * Decorators — mindmap-shell-v2 (task 4).
 *
 * React hooks that wrap the pure `decorateNodes` / `decorateEdges`
 * helpers in `flowShellUtils.ts`. The decoration pipeline
 * (dim + streaming + search-match) is shared between `CanvasLayout`
 * and any future preview surfaces (e.g. the Storybook story).
 *
 * We use `useMemo` so a parent that toggles a decoration does not
 * re-run the entire layout — only the decoration pass.
 */
import { useMemo } from 'react'
import type { Edge } from '@xyflow/react'
import { decorateEdges, decorateNodes, type ShapeFlowNode } from './flowShellUtils'

/**
 * Apply the per-node decorations (dim / streaming / search-match)
 * to a list of *layouted* nodes. The input must already have gone
 * through `applyDagreLayout` — this hook only adds className
 * hooks via `data`.
 */
export function useDecoratedNodes(
  layoutedNodes: ReadonlyArray<ShapeFlowNode>,
  options: {
    dimmedIds?: ReadonlySet<string>
    isStreaming?: boolean
    searchMatchIds?: ReadonlySet<string>
  },
): ShapeFlowNode[] {
  const { dimmedIds, isStreaming, searchMatchIds } = options
  return useMemo(
    () => decorateNodes(layoutedNodes, { dimmedIds, isStreaming, searchMatchIds }),
    [layoutedNodes, dimmedIds, isStreaming, searchMatchIds],
  )
}

/**
 * Apply the per-edge decorations (dim) to a list of layouted
 * edges. The "stream" animation on edges is CSS-driven (the
 * `.streaming` class is set on the React Flow edge wrapper by
 * `CanvasLayout`).
 */
export function useDecoratedEdges(
  layoutedEdges: ReadonlyArray<Edge>,
  dimmedEdgeIds: ReadonlySet<string> | undefined,
): Edge[] {
  return useMemo(() => decorateEdges(layoutedEdges, dimmedEdgeIds), [layoutedEdges, dimmedEdgeIds])
}
