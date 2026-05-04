## MODIFIED Requirements

### Requirement: MindMap data model
系统 SHALL 使用以下数据模型表示思维导图：

```
MindMap {
  id: string           // UUID
  title: string        // 图谱标题
  tree: MindMapNode[]  // 根层级节点列表
  maxDepth?: number    // 最大生成深度：1-5 或 0（自动），默认 3（新增）
  createdAt: number    // 创建时间戳
  updatedAt: number    // 更新时间戳
  generatorProviderId?: string
  generatorModelId?: string
}
```

#### Scenario: MindMap data structure
- **WHEN** 系统创建新的思维导图
- **THEN** 生成唯一 ID，记录创建时间，tree 初始为空数组，maxDepth 设为 3

#### Scenario: MindMapNode with source tracking
- **WHEN** 图谱生成完成
- **THEN** 每个节点的 `sourceConversationIds` 填充对话来源，`sourceExcerpts` 存储对应的消息摘录文本

#### Scenario: Edited node marks
- **WHEN** 用户手动编辑节点
- **THEN** 节点 `editedByUser` 设为 true，`sourceConversationIds` 清空
