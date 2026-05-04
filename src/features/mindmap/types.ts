import { type Node, type Edge } from '@xyflow/react'

export interface MindMapNodeData extends Record<string, unknown> {
  label: string
  summary: string
  editedByUser: boolean
  sourceCount: number
  hasChildren: boolean
  collapsed: boolean
}

export type MindMapFlowNode = Node<MindMapNodeData, 'mindmap'>
export type MindMapFlowEdge = Edge
