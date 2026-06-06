export interface FlowNodeData extends Record<string, unknown> {
  label: string
  summary: string
  content?: string
  contentType?: 'text' | 'html'
  depth: number
  pattern: string
  editedByUser: boolean
  hasChildren: boolean
  collapsed: boolean
  /** Stage A1: in-place expand state (component-level, not persisted). */
  expanded?: boolean
  /** Stage A1: optional override for runtime width/height hint from the layout. */
  size?: { width: number; height: number }
  onToggle?: (nodeId: string) => void
}

export type { FlowShellProps, FlowShellHandle } from './FlowShell'
export { default as FlowShell } from './FlowShell'
export { default as FlowNode } from './FlowNode'
