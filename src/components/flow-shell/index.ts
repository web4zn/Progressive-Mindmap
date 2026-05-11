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
  onToggle?: (nodeId: string) => void
}

export type { FlowShellProps } from './FlowShell'
export { default as FlowShell } from './FlowShell'
export { default as FlowNode } from './FlowNode'
