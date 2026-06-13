/**
 * Pure logic used by `CanvasLayout` (mindmap-shell-v2, task 4).
 *
 * This file deliberately does not import React. The hooks that
 * wrap these helpers (in `Decorators.tsx`) live in a separate
 * file so tests can import the pure layout/decorator functions
 * without dragging in the React runtime.
 */
import dagre from '@dagrejs/dagre'
import type { Node, Edge, BackgroundVariant } from '@xyflow/react'
import { computeNodeSize, type NodeSize } from '@/lib/mindmap-flow'
import type { FlowNodeData } from '../index'
import type { NodeShapeName } from '@/types/mindmap'

/** Re-export the type for callers that need the narrowed shape. */
export type ShapeFlowNode = Node<FlowNodeData, NodeShapeName>

/** Stage A1: text-node default. */
const DEFAULT_TEXT_SIZE: NodeSize = { width: 200, height: 100 }

/**
 * Run the dagre LR/TB layout over the supplied React Flow
 * nodes/edges. Pure function — given the same input, always
 * returns the same output. Synchronous.
 */
export function applyDagreLayout(
  flowNodes: ReadonlyArray<ShapeFlowNode>,
  flowEdges: ReadonlyArray<Edge>,
  direction: 'dagre-lr' | 'dagre-tb',
): { nodes: ShapeFlowNode[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction === 'dagre-tb' ? 'TB' : 'LR',
    nodesep: 50,
    ranksep: 160,
    edgesep: 40,
    marginx: 60,
    marginy: 60,
  })

  const sizes = new Map<string, NodeSize>()
  for (const n of flowNodes) {
    const size = computeNodeSize({
      label: n.data?.label ?? '',
      summary: n.data?.summary ?? '',
      hasChildren: !!n.data?.hasChildren,
    })
    sizes.set(n.id, size)
    g.setNode(n.id, { width: size.width, height: size.height })
  }
  for (const e of flowEdges) {
    g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  const layoutedNodes = flowNodes.map((n) => {
    const pos = g.node(n.id)
    if (!pos) return n
    const size = sizes.get(n.id) ?? DEFAULT_TEXT_SIZE
    return {
      ...n,
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
      width: size.width,
      height: size.height,
    }
  })

  return { nodes: layoutedNodes as ShapeFlowNode[], edges: [...flowEdges] }
}

/**
 * Apply the dim/streaming/search-match decorations to a list of
 * layouted nodes. Pure function.
 *
 * - `dimmedIds` / `searchMatchIds` mark nodes that should get the
 *   matching CSS class hook.
 * - `isStreaming && depth < 3` enables the streaming shimmer.
 * - We return a new array; nodes whose decorations haven't changed
 *   are returned by reference so React Flow's reconciliation
 *   doesn't see a spurious prop change.
 */
export function decorateNodes(
  layoutedNodes: ReadonlyArray<ShapeFlowNode>,
  options: {
    dimmedIds?: ReadonlySet<string>
    isStreaming?: boolean
    searchMatchIds?: ReadonlySet<string>
  },
): ShapeFlowNode[] {
  const { dimmedIds, isStreaming, searchMatchIds } = options
  return layoutedNodes.map((n) => {
    const isDimmed = !!dimmedIds && dimmedIds.has(n.id)
    const isSearchMatch = !!searchMatchIds && searchMatchIds.has(n.id)
    const depth = n.data?.depth ?? 0
    const showStreaming = !!isStreaming && depth < 3
    const data = n.data
    if (
      data?.isDimmed === isDimmed &&
      data?.isStreaming === showStreaming &&
      data?.isSearchMatch === isSearchMatch
    ) {
      return n
    }
    return {
      ...n,
      data: {
        ...(data ?? ({} as FlowNodeData)),
        isDimmed,
        isStreaming: showStreaming,
        isSearchMatch,
      },
    }
  })
}

/**
 * Add a `dimmed` className to edges that are in `dimmedEdgeIds`.
 * Pure function. Edges not in the set are returned by reference.
 */
export function decorateEdges(
  layoutedEdges: ReadonlyArray<Edge>,
  dimmedEdgeIds: ReadonlySet<string> | undefined,
): Edge[] {
  if (!dimmedEdgeIds || dimmedEdgeIds.size === 0) return [...layoutedEdges]
  return layoutedEdges.map((e) => {
    if (dimmedEdgeIds.has(e.id)) {
      return { ...e, className: `${e.className ?? ''} dimmed`.trim() }
    }
    return e
  })
}

/**
 * Merge a freshly-decorated node list into the current `nodes`
 * state, **preserving the current `position` of every node**.
 *
 * The decoration pipeline (dim / streaming / search-match) only
 * ever changes the `data` field of each node, but the
 * dagre-computed position embedded in the decorated node is the
 * *initial* layout position — not the position the user may
 * have just dragged to. If the canvas naively did
 * `setNodes(decoratedNodes)`, the dragged position would be
 * clobbered back to the dagre value on every hover / streaming
 * toggle, which is why the mindmap felt "stuck" when you tried
 * to drag a node around (the cursor moved but the node snapped
 * back to its dagre slot).
 *
 * This helper is the correct replacement: it builds a map of
 * the previous node list by id, then for every decorated node
 * looks up the previous instance and keeps its `position`. The
 * returned array reuses the previous node reference when neither
 * `data` nor `position` changed, so React Flow's `memo`/`shallow`
 * checks stay cheap.
 *
 * Pure function. Caller passes both the current and the freshly
 * decorated lists; this returns the merged list (or `prev` by
 * reference when nothing changed).
 */
export function mergeDecoratedNodes(
  prev: ReadonlyArray<ShapeFlowNode>,
  decorated: ReadonlyArray<ShapeFlowNode>,
): ShapeFlowNode[] {
  const prevById = new Map<string, ShapeFlowNode>()
  for (const n of prev) prevById.set(n.id, n)
  let changed = false
  const next = decorated.map((dn) => {
    const cur = prevById.get(dn.id)
    if (cur && cur.data === dn.data && cur.position === dn.position) {
      return cur
    }
    changed = true
    const position = cur?.position ?? dn.position
    return { ...dn, position }
  })
  return changed ? next : (prev as ShapeFlowNode[])
}

/**
 * Reduce a list of nodes to a structural fingerprint (id list,
 * content-type, content presence, edge list).
 *
 * Used as a `useMemo` dependency key in the parent. We deliberately
 * exclude the dim/streaming flags — those change often and have
 * their own, cheaper effect.
 */
export function structuralFingerprint(
  nodes: ReadonlyArray<ShapeFlowNode>,
  edges: ReadonlyArray<Edge>,
): string {
  return JSON.stringify({
    n: nodes.map((n) => ({
      id: n.id,
      ct: n.data?.contentType,
      hasContent: !!n.data?.content,
    })),
    e: edges.map((e) => `${e.source}→${e.target}`),
  })
}

/**
 * Map a `background` literal to the xyflow `BackgroundVariant` enum.
 * Pure function. Centralised so the cast sits in one place.
 */
export function resolveBackgroundVariant(
  background: 'dots' | 'grid' | 'none',
): BackgroundVariant | null {
  if (background === 'none') return null
  return background === 'grid' ? ('lines' as BackgroundVariant) : ('dots' as BackgroundVariant)
}
