import { type Node, type Edge } from '@xyflow/react'

export interface MindMapNodeData extends Record<string, unknown> {
  label: string
  summary: string
  content?: string
  /** Stage B: 'markdown' is a third content type. */
  contentType?: 'text' | 'html' | 'markdown'
  editedByUser: boolean
  hasChildren: boolean
  collapsed: boolean
}

export type MindMapFlowNode = Node<MindMapNodeData, 'mindmap'>
export type MindMapFlowEdge = Edge
