## MODIFIED Requirements

### Requirement: MindMap data model
系统 SHALL 使用以下数据模型表示思维导图：

```
MindMap {
  id: string           // UUID
  title: string        // 图谱标题
  tree: MindMapNode[]  // 根层级节点列表
  createdAt: number    // 创建时间戳
  updatedAt: number    // 更新时间戳
  generatorProviderId?: string
  generatorModelId?: string
}

MindMapNode {
  id: string                      // UUID
  label: string                   // 节点显示文本
  summary: string                 // 节点描述
  children: MindMapNode[]         // 子节点列表
  sourceConversationIds: string[] // 贡献该节点的 Conversation ID 列表
  sourceExcerpts: Record<string, string> // Conversation ID → 消息文本摘录
  editedByUser: boolean           // 是否被用户手动编辑过（默认 false）
}
```

#### Scenario: MindMapNode with source tracking
- **WHEN** 图谱生成完成
- **THEN** 每个节点的 `sourceConversationIds` 填充对话来源，`sourceExcerpts` 存储对应的消息摘录文本

#### Scenario: Edited node marks
- **WHEN** 用户手动编辑节点
- **THEN** 节点 `editedByUser` 设为 true，`sourceConversationIds` 清空

### Requirement: Conversation-MindMap linking
系统 SHALL 允许 Conversation 关联到一个 MindMap。关联关系通过 Conversation 的 `mindmapId` 字段存储。关联关系 SHALL 可随时变更。

#### Scenario: Link conversation to mindmap
- **WHEN** 用户在会话设置中选择一个图谱并保存
- **THEN** Conversation 的 `mindmapId` 更新为该图谱 ID

#### Scenario: Unlink conversation from mindmap
- **WHEN** 用户选择「不关联」并保存
- **THEN** Conversation 的 `mindmapId` 设为 undefined

## ADDED Requirements

### Requirement: MaterialItem data model
系统 SHALL 维护一个物料池数据结构 `MaterialItem`：

```
MaterialItem {
  id: string            // UUID
  conversationId: string
  messageId: string
  selectedText?: string // 若为文本片段选中，存储选中文本
  addedAt: number       // 添加时间戳
}
```

物料池 SHALL 存储在 Zustand `useMaterialStore` 中，不持久化。

#### Scenario: MaterialItem from full message
- **WHEN** 用户勾选整条消息
- **THEN** 创建 MaterialItem，`selectedText` 为 undefined

#### Scenario: MaterialItem from text fragment
- **WHEN** 用户选中消息内部分文本并右键添加
- **THEN** 创建 MaterialItem，`selectedText` 为选中的文本内容
