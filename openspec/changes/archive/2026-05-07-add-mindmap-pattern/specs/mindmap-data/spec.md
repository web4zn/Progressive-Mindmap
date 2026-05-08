## MODIFIED Requirements

### Requirement: MindMap data model
系统 SHALL 使用以下数据模型表示思维导图：

```
MindMap {
  id: string
  title: string
  tree: MindMapNode[]
  pattern?: string            // 知识组织模式，默认 "auto"
  monitoredConversationIds: string[]
  collapsedNodeIds?: string[]
  createdAt: number
  updatedAt: number
}
```

#### Scenario: MindMap with pattern
- **WHEN** 创建脑图时指定 pattern 为 `"5w1h"`
- **THEN** MindMap 记录 pattern 字段，持久化到 IndexedDB

#### Scenario: Legacy mindmap without pattern
- **WHEN** 旧脑图数据加载，pattern 字段为 undefined
- **THEN** 系统正常渲染，pattern 视为 `"auto"`
