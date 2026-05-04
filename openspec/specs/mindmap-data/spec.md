## ADDED Requirements

### Requirement: MindMap data model
系统 SHALL 使用以下数据模型表示思维导图：

```
MindMap {
  id: string                       // UUID
  title: string                    // 图谱标题
  tree: MindMapNode[]              // 根层级节点列表
  maxDepth?: number                // 最大生成深度：3-5 或 0（自动），默认 3
  corpus: CorpusEntry[]            // 语料库条目列表
  monitoredConversationIds: string[] // 监听的对话 ID 列表
  forceFullRebuild?: boolean       // 强制全量重建模式
  lastGeneratedAt?: number         // 上次生成时间戳
  createdAt: number                // 创建时间戳
  updatedAt: number                // 更新时间戳
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

#### Scenario: MindMap data structure
- **WHEN** 系统创建新的思维导图
- **THEN** 生成唯一 ID，记录创建时间，tree 初始为空数组，maxDepth 设为 3

#### Scenario: MindMapNode with source tracking
- **WHEN** 图谱生成完成
- **THEN** 每个节点的 `sourceConversationIds` 填充对话来源，`sourceExcerpts` 存储对应的消息摘录文本

#### Scenario: Edited node marks
- **WHEN** 用户手动编辑节点
- **THEN** 节点 `editedByUser` 设为 true，`sourceConversationIds` 清空

### Requirement: Create mindmap
系统 SHALL 允许用户创建新的思维导图。用户 MUST 提供图谱标题。创建后 SHALL 自动在侧边栏显示新图谱条目。

#### Scenario: Create mindmap via sidebar
- **WHEN** 用户在侧边栏"思维导图"分区点击"新建图谱"
- **THEN** 系统创建空白思维导图，使用用户输入的标题，显示在侧边栏列表中

#### Scenario: Create mindmap via new conversation dialog
- **WHEN** 用户在新建对话对话框中选择"创建新图谱"并输入名称、提交
- **THEN** 系统创建新图谱并将当前 Conversation 关联到该图谱

### Requirement: MindMap persistence
系统 SHALL 将思维导图数据持久化到浏览器 IndexedDB。持久化 SHALL 通过 Zustand persist 中间件 + `createIndexedDBStorage()` 适配器实现。数据 SHALL 在页面刷新后完整恢复。

#### Scenario: Persistence across page reload
- **WHEN** 用户刷新页面或关闭后重新打开应用
- **THEN** 所有已创建的思维导图及其树结构从 IndexedDB 完整恢复

### Requirement: MindMap listing in sidebar
系统 SHALL 在侧边栏提供思维导图列表区域，显示所有已创建的图谱。列表项 SHALL 显示图谱标题和更新时间。用户 SHALL 可点击图谱项切换到该图谱的视图。

#### Scenario: MindMap list display
- **WHEN** 用户打开侧边栏
- **THEN** 在对话列表下方显示"思维导图"分区标题，列出所有图谱，每个项显示标题和相对更新时间

#### Scenario: Click mindmap in sidebar
- **WHEN** 用户点击侧边栏中的图谱项
- **THEN** 系统将该图谱设为当前活跃图谱，在右侧面板中渲染其树结构

