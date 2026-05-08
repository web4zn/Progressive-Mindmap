export interface MindMapNode {
  id: string
  label: string
  summary: string
  content?: string
  contentType?: 'text' | 'markdown'
  children: MindMapNode[]
  editedByUser: boolean
}

export interface MindMap {
  id: string
  title: string
  tree: MindMapNode[]
  pattern?: string
  monitoredConversationIds: string[]
  collapsedNodeIds?: string[]
  createdAt: number
  updatedAt: number
}
