import { type Node, type Edge } from '@xyflow/react'

export interface MindMapNodeData extends Record<string, unknown> {
  label: string
  summary: string
  content?: string
  contentType?: 'text' | 'html'
  editedByUser: boolean
  hasChildren: boolean
  collapsed: boolean
}

export type MindMapFlowNode = Node<MindMapNodeData, 'mindmap'>
export type MindMapFlowEdge = Edge
