export interface MindMapNode {
  id: string
  label: string
  summary: string
  content?: string
  contentType?: 'text' | 'markdown'
  children: MindMapNode[]
  sourceConversationIds: string[]
  sourceExcerpts: Record<string, string>
  editedByUser: boolean
}

export interface MindMap {
  id: string
  title: string
  tree: MindMapNode[]
  monitoredConversationIds: string[]
  collapsedNodeIds?: string[]
  createdAt: number
  updatedAt: number
}
