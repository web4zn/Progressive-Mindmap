import type { Node, Edge } from '@xyflow/react'
import type { MindMapNode, NodeShapeName } from '../types/mindmap'
import type { FlowNodeData } from '../components/flow-shell'
import { resolveShapeName } from './shapes/types'

/**
 * Output types for treeToFlowShell — narrowed React Flow shapes.
 *
 * `mindmap-shell-v2` (task 4): the per-node `type` literal is
 * the node's `shape` name (e.g. `'rect'`, `'chip'`, `'circle'`,
 * `'stadium'`), not the v1 hardcoded `'flow'`. React Flow looks
 * the component up by this key in `FlowShell`'s `nodeTypes` map.
 *
 * `Readonly` views are exported for callers that need to pass
 * these into a React Flow provider without losing type info.
 * The mutable variants are kept for internal accumulator use.
 */
export type FlowShellNodes = Node<FlowNodeData, NodeShapeName>[]
export type FlowShellEdges = Edge[]
export type ReadonlyFlowShellNodes = ReadonlyArray<Node<FlowNodeData, NodeShapeName>>
export type ReadonlyFlowShellEdges = ReadonlyArray<Edge>

/**
 * Flatten a MindMapNode tree into a React Flow (nodes, edges) pair, honoring
 * `collapsedIds` and propagating depth / pattern / content metadata.
 *
 * Pure function — no React, no side effects. Mirrors the implementation that
 * previously lived inside MindMapTree.tsx so it can be unit-tested in
 * isolation.
 *
 * `mindmap-shell-v2`: the `type` field on each emitted node is the
 * resolved shape name (so React Flow can route to the right shape
 * component). Unknown shape strings fall back to `'rect'`.
 */
export function treeToFlowShell(
  tree: ReadonlyArray<MindMapNode>,
  collapsedIds: ReadonlySet<string>,
  toggleCollapse: (id: string) => void,
  pattern: string,
  depth = 0,
): { nodes: FlowShellNodes; edges: FlowShellEdges } {
  const flowNodes: FlowShellNodes = []
  const flowEdges: FlowShellEdges = []

  function walk(list: ReadonlyArray<MindMapNode>, parentId: string | null, d: number): void {
    for (const n of list) {
      const hasChildren = n.children.length > 0
      const isCollapsed = collapsedIds.has(n.id)
      // The v2 node carries no `shape` field; the renderer always
      // falls back to `'rect'`. Pass `undefined` so `resolveShapeName`
      // can collapse any stale value (e.g. a v1 carry-over) into the
      // same default.
      const shape = resolveShapeName(undefined)

      flowNodes.push({
        id: n.id,
        type: shape,
        position: { x: 0, y: 0 },
        data: {
          label: n.label,
          summary: n.summary,
          content: n.content,
          contentType: n.contentType,
          depth: d,
          pattern,
          editedByUser: n.editedByUser,
          hasChildren,
          collapsed: isCollapsed,
          onToggle: toggleCollapse,
        },
      })

      if (parentId) {
        flowEdges.push({
          id: `${parentId}-${n.id}`,
          source: parentId,
          target: n.id,
        })
      }

      if (!isCollapsed) {
        walk(n.children, n.id, d + 1)
      }
    }
  }

  walk(tree, null, depth)
  return { nodes: flowNodes, edges: flowEdges }
}

export interface ComputeNodeSizeInput {
  label: string
  summary: string
  hasChildren: boolean
}

export interface NodeSize {
  width: number
  height: number
}

/**
 * Width/height hint for dagre layout, derived from label / summary length.
 * Constrained to ranges that keep the dagre LR layout readable:
 * - width 120-280, height 56-110
 */
export function computeNodeSize(input: ComputeNodeSizeInput): NodeSize {
  const { label, summary, hasChildren } = input

  const labelLen = label.length
  // CJK characters count as ~2 width units; we approximate with a simple
  // length-based heuristic (no need to do exact Unicode width math here).
  const labelWidth = Math.ceil(labelLen * 0.85)

  const summaryLines = summary ? Math.max(1, Math.ceil(summary.length / 24)) : 0
  const summaryWidth = summaryLines * 24

  // Width budget: take the dominant text dimension, then add padding.
  const contentWidth = Math.max(labelWidth, summaryWidth) + 32
  // Pad for collapse button + edit badge + a little breathing room.
  const rowPadding = hasChildren ? 48 : 32

  // Text / summary node
  const baseWidth = 120
  const maxWidth = 280
  const width = clamp(contentWidth + rowPadding, baseWidth, maxWidth)
  // Header line + summary lines, capped modestly.
  const summaryHeight = summaryLines * 18
  const height = clamp(46 + summaryHeight, 56, 110)
  return { width, height }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}
