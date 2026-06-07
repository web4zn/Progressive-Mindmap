export interface FlowNodeData extends Record<string, unknown> {
  label: string
  summary: string
  content?: string
  /** Stage B: 'markdown' is a third content type. The FlowNode
   *  renders anything other than 'html' as plain text; the modal
   *  preview (in edit mode) is the canonical markdown renderer. */
  contentType?: 'text' | 'html' | 'markdown'
  depth: number
  pattern: string
  editedByUser: boolean
  hasChildren: boolean
  collapsed: boolean
  /** Stage A1: in-place expand state (component-level, not persisted). */
  expanded?: boolean
  /** Stage A1: optional override for runtime width/height hint from the layout. */
  size?: { width: number; height: number }
  /** Stage A2: hover-path highlight. When true the node is rendered with
   *  reduced opacity (`.flow-node.dimmed`). */
  isDimmed?: boolean
  /** Stage A2: streaming shimmer. When true the node gets
   *  `.flow-node.streaming` which triggers the diagonal sweep animation
   *  (suppressed under prefers-reduced-motion). */
  isStreaming?: boolean
  onToggle?: (nodeId: string) => void
}

export type { FlowShellProps, FlowShellHandle } from './FlowShell'
export { default as FlowShell } from './FlowShell'
export { default as FlowNode } from './FlowNode'
