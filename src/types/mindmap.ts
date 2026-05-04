export interface MindMapNode {
  id: string
  label: string
  summary: string
  children: MindMapNode[]
  sourceConversationIds: string[]
  sourceExcerpts: Record<string, string>
  editedByUser: boolean
}

export interface CorpusEntry {
  id: string
  messageId: string
  selectedText?: string
  range?: { start: number; end: number }
  note?: string
  enabled: boolean
  addedAt: number
}

export type IncrementalOperation =
  | { op: 'add_child'; parent_id: string; node: { label: string; summary: string } }
  | { op: 'update'; node_id: string; changes: { label?: string; summary?: string } }
  | { op: 'merge'; from_id: string; to_id: string }
  | { op: 'delete_leaf'; node_id: string }
  | { op: 'noop' }

export interface IncrementalResult {
  analysis: string
  operations: IncrementalOperation[]
}

export interface ChangeRecord {
  op: IncrementalOperation['op']
  nodeId: string
  description: string
  timestamp: number
}

export interface ValidationWarning {
  type: 'duplicate' | 'empty-label' | 'depth-exceeded' | 'breadth-exceeded'
  nodeLabel: string
  message: string
}

export interface MindMap {
  id: string
  title: string
  tree: MindMapNode[]
  corpus: CorpusEntry[]
  monitoredConversationIds: string[]
  collapsedNodeIds?: string[]
  maxDepth?: number
  generatorProviderId?: string
  generatorModelId?: string
  forceFullRebuild?: boolean
  lastGeneratedAt?: number
  createdAt: number
  updatedAt: number
}
