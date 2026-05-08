## MODIFIED Requirements

### Requirement: MindMap data model
系统 SHALL 使用以下数据模型表示思维导图：

```
MindMap {
  id: string
  title: string
  tree: MindMapNode[]
  monitoredConversationIds: string[]
  collapsedNodeIds?: string[]
  createdAt: number
  updatedAt: number
}

MindMapNode {
  id: string
  label: string
  summary: string
  content?: string
  contentType?: 'text' | 'markdown'
  children: MindMapNode[]
  editedByUser: boolean
}
```

#### Scenario: MindMap data structure
- **WHEN** 系统创建新的思维导图
- **THEN** 生成唯一 ID，记录创建时间，tree 初始为空数组

#### Scenario: Edited node marks
- **WHEN** 用户手动编辑节点
- **THEN** 节点 `editedByUser` 设为 true

## REMOVED Requirements

### Requirement: MindMapNode with source tracking
**Reason**: `sourceConversationIds` / `sourceExcerpts` 从未被填充，无数据流。
**Migration**: 字段将在后续 `remove-mindmap-marker` change 中从类型定义中移除。现有初始化代码中 `[]` / `{}` 的值可安全忽略。

### Requirement: MindMap fields (maxDepth, corpus, etc.)
**Reason**: `maxDepth`, `corpus`, `forceFullRebuild`, `generatorProviderId`, `generatorModelId`, `lastGeneratedAt` 未在 `src/types/mindmap.ts` 中定义，不对应实际代码。
**Migration**: 无需迁移。这些字段从未在代码中存在过。
