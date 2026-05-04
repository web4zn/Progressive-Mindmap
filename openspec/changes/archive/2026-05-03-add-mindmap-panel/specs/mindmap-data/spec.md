## ADDED Requirements

### Requirement: MindMap data model
系统 SHALL 使用以下数据模型表示思维导图：

```
MindMap {
  id: string           // UUID
  title: string        // 图谱标题，如 "React 学习笔记"
  tree: MindMapNode[]  // 根层级节点列表（通常 1 个根节点）
  createdAt: number    // 创建时间戳
  updatedAt: number    // 更新时间戳
}

MindMapNode {
  id: string                      // UUID
  label: string                   // 节点显示文本
  summary: string                 // 节点描述（AI 生成的 1-2 句总结）
  children: MindMapNode[]         // 子节点列表
  sourceConversationIds: string[] // 贡献该节点的 Conversation ID 列表
}
```

#### Scenario: MindMap data structure
- **WHEN** 系统创建新的思维导图
- **THEN** 生成唯一 ID，记录创建时间，tree 初始为空数组

#### Scenario: MindMapNode tree structure
- **WHEN** 一个图谱包含多层节点
- **THEN** 节点通过 children 数组递归嵌套，根节点通过 tree 数组引用，最大深度为 3 层

### Requirement: Create mindmap
系统 SHALL 允许用户创建新的思维导图。用户 MUST 提供图谱标题。创建后 SHALL 自动在侧边栏显示新图谱条目。

#### Scenario: Create mindmap via sidebar
- **WHEN** 用户在侧边栏"思维导图"分区点击"新建图谱"
- **THEN** 系统创建空白思维导图，使用用户输入的标题，显示在侧边栏列表中

#### Scenario: Create mindmap via new conversation dialog
- **WHEN** 用户在新建对话对话框中选择"创建新图谱"并输入名称、提交
- **THEN** 系统创建新图谱并将当前 Conversation 关联到该图谱

### Requirement: Delete mindmap
系统 SHALL 允许用户删除思维导图。删除前 SHALL 显示确认对话框。删除图谱后，关联的 Conversation 的 `mindmapId` SHALL 被清除，但不删除 Conversation 数据。

#### Scenario: Delete mindmap with confirmation
- **WHEN** 用户点击删除图谱并确认
- **THEN** 系统删除该图谱及其所有节点数据，关联的 Conversation 的 mindmapId 设为 undefined

### Requirement: MindMap persistence
系统 SHALL 将思维导图数据（title、tree、时间戳）持久化到浏览器 IndexedDB。数据 SHALL 在页面刷新后完整恢复。

#### Scenario: Persistence across page reload
- **WHEN** 用户刷新页面或关闭后重新打开应用
- **THEN** 所有已创建的思维导图及其树结构完整恢复

### Requirement: Conversation-MindMap linking
系统 SHALL 允许 Conversation 关联到某个 MindMap。关联关系通过 Conversation 的 `mindmapId` 字段存储。一个 Conversation 最多关联一个 MindMap。关联关系 SHALL 可随时变更。

#### Scenario: Link conversation to mindmap
- **WHEN** 用户在会话设置中将某个 Conversation 关联到已有图谱
- **THEN** Conversation 的 mindmapId 更新为该图谱 ID

#### Scenario: Unlink conversation from mindmap
- **WHEN** 用户清空 Conversation 的图谱关联
- **THEN** Conversation 的 mindmapId 设为 undefined，不再受该图谱管理

#### Scenario: Change mindmap association
- **WHEN** 用户将 Conversation 从图谱 A 切换到图谱 B
- **THEN** Conversation 的 mindmapId 更新为图谱 B 的 ID

### Requirement: MindMap listing in sidebar
系统 SHALL 在侧边栏提供思维导图列表区域，显示所有已创建的图谱。列表项 SHALL 显示图谱标题和更新时间。用户 SHALL 可点击图谱项切换到该图谱的视图。

#### Scenario: MindMap list display
- **WHEN** 用户打开侧边栏
- **THEN** 在对话列表下方显示"思维导图"分区标题，列出所有图谱，每个项显示标题和相对更新时间

#### Scenario: Click mindmap in sidebar
- **WHEN** 用户点击侧边栏中的图谱项
- **THEN** 系统将该图谱设为当前活跃图谱，在右侧面板中渲染其树结构
