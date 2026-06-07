export interface MindMapNode {
  id: string
  label: string
  summary: string
  content?: string
  /**
   * Stage B adds 'markdown' as a third content type. The store /
   * sanitizer / FlowNode HTML preview all key off this field, and
   * nodes that pre-date Stage B still have only 'text' | 'html'.
   */
  contentType?: 'text' | 'html' | 'markdown'
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
