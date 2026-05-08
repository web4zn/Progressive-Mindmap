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

#### Scenario: New node with markdown content
- **WHEN** 创建 MindMapNode 且指定 `contentType: 'markdown'` 和 `content: '## Title\n\nContent'`
- **THEN** 节点存储完整 Markdown 内容且类型标记为 markdown

#### Scenario: Existing node remains compatible
- **WHEN** 现有节点（无 `contentType` 和 `content` 字段）被反序列化
- **THEN** 节点正常加载，`contentType` 默认为 `'text'`，行为与旧版本一致
