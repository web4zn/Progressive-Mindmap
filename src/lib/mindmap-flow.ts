import type { Node, Edge } from '@xyflow/react'
import type { MindMapNode } from '../types/mindmap'
import type { FlowNodeData } from '../components/flow-shell'

/**
 * Output types for treeToFlowShell — narrowed React Flow shapes.
 * The `flow` type literal matches the nodeType registered in FlowShell.
 */
export type FlowShellNodes = Node<FlowNodeData, 'flow'>[]
export type FlowShellEdges = Edge[]

/**
 * Flatten a MindMapNode tree into a React Flow (nodes, edges) pair, honoring
 * `collapsedIds` and propagating depth / pattern / content metadata.
 *
 * Pure function — no React, no side effects. Mirrors the implementation that
 * previously lived inside MindMapTree.tsx so it can be unit-tested in
 * isolation.
 */
export function treeToFlowShell(
  tree: MindMapNode[],
  collapsedIds: Set<string>,
  toggleCollapse: (id: string) => void,
  pattern: string,
  depth = 0,
): { nodes: FlowShellNodes; edges: FlowShellEdges } {
  const flowNodes: FlowShellNodes = []
  const flowEdges: FlowShellEdges = []

  function walk(list: MindMapNode[], parentId: string | null, d: number): void {
    for (const n of list) {
      const hasChildren = n.children.length > 0
      const isCollapsed = collapsedIds.has(n.id)

      flowNodes.push({
        id: n.id,
        type: 'flow',
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
          expanded: false,
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
  /** Pre-computed character length of the HTML content body (saves the caller from re-counting). */
  contentLength?: number
  hasHtml: boolean
  hasChildren: boolean
}

export interface NodeSize {
  width: number
  height: number
}

/**
 * Width/height hint for dagre layout, derived from label / summary / content
 * length. Constrained to ranges that keep the dagre LR layout readable:
 * - text node: width 120-280, height 56-110
 * - HTML node: width 260-360, height min(80 + content lines, 380)
 */
export function computeNodeSize(input: ComputeNodeSizeInput): NodeSize {
  const { label, summary, contentLength, hasHtml, hasChildren } = input

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

  if (hasHtml) {
    const baseWidth = 260
    const maxWidth = 360
    const width = clamp(contentWidth + rowPadding, baseWidth, maxWidth)
    // Approximate lines from content length (avg 60 chars per line at 13px).
    const contentLines = Math.max(4, Math.ceil((contentLength ?? 200) / 60))
    const height = clamp(80 + contentLines * 22, 140, 380)
    return { width, height }
  }

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
