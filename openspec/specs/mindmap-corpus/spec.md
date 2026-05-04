## ADDED Requirements

### Requirement: CorpusEntry data model
系统 SHALL 定义语料条目 `CorpusEntry` 类型，表达一条消息到图谱的关联：

```
CorpusEntry {
  id: string                     // UUID
  messageId: string              // 指向 conversationStore 中的 Message
  selectedText?: string          // 选中文本片段（原始回答的子文本）
  range?: { start: number; end: number }  // 选中文本在原始回答中的字符偏移
  note?: string                  // 用户备注
  enabled: boolean               // 是否参与生成，默认 true
  addedAt: number                // 添加时间戳
}
```

`selectedText` SHALL 是 `messageId` 指向的 Message 的子文本。生成时：有 `selectedText` 时 SHALL 使用片段内容；无 `selectedText` 时 SHALL 使用整条消息内容。

#### Scenario: CorpusEntry from full message
- **WHEN** 用户将整条 AI 回答加入语料库
- **THEN** 创建 CorpusEntry，`messageId` 指向该消息，`selectedText` 为 undefined

#### Scenario: CorpusEntry from text fragment
- **WHEN** 用户选中 AI 回答中的一段文本加入语料库
- **THEN** 创建 CorpusEntry，`messageId` 指向该消息，`selectedText` 为选中文本，`range` 记录字符偏移

### Requirement: MindMap corpus field
`MindMap` 数据模型 SHALL 新增 `corpus` 字段，类型为 `CorpusEntry[]`。新建图谱 SHALL 默认 `corpus` 为空数组。图谱删除时 SHALL 同时删除其语料数据。

#### Scenario: New mindmap has empty corpus
- **WHEN** 用户创建新图谱
- **THEN** 图谱的 `corpus` 初始化为空数组 `[]`

#### Scenario: Corpus persists with mindmap
- **WHEN** 用户刷新页面或重新打开应用
- **THEN** 图谱的 `corpus` 数据随图谱一起从 IndexedDB 恢复

### Requirement: MindMap monitored conversations
`MindMap` 数据模型 SHALL 新增 `monitoredConversationIds` 字段，类型为 `string[]`。该字段记录图谱监听的对话列表。被监听对话产生新 AI 回答时，系统 SHALL 自动将该回答加入图谱语料库并在 5 秒 debounce 后触发生成。

#### Scenario: Monitor a conversation
- **WHEN** 用户在图谱设置中将对话 X 加入监听列表
- **THEN** 对话 X 的 ID 加入 `monitoredConversationIds`

#### Scenario: New answer in monitored conversation auto-added to corpus
- **WHEN** 对话 X 被图谱监听，AI 在对话 X 中完成回复
- **THEN** 系统自动创建 CorpusEntry（messageId 指向新回复），加入图谱 corpus，并在 5 秒 debounce 后触发图谱生成

#### Scenario: Unmonitor a conversation
- **WHEN** 用户从监听列表移除对话 X
- **THEN** 对话 X 的新回复不再自动加入图谱语料库

### Requirement: Add corpus entry to mindmap
系统 SHALL 支持用户将一条消息直接加入图谱语料库。操作方式 SHALL 包括：消息旁的「加入语料库」按钮、选中文本后右键「加入语料库」。操作 SHALL 直接创建 CorpusEntry 并加入当前活跃图谱的 corpus。

#### Scenario: Add full message via button
- **WHEN** 用户在 AI 回答旁点击「加入语料库」按钮
- **THEN** 创建 CorpusEntry 加入当前活跃图谱的 corpus，`selectedText` 为 undefined

#### Scenario: Add text fragment via button
- **WHEN** 用户选中 AI 回答中的一段文本后点击「加入语料库」按钮
- **THEN** 通过 `onMouseDown` 捕获选中文本，创建 CorpusEntry，`selectedText` 为选中文本，`range` 记录偏移

#### Scenario: No active mindmap
- **WHEN** 用户点击「加入语料库」但没有打开的图谱
- **THEN** 操作静默跳过，不执行任何动作

### Requirement: Batch add conversation messages to corpus
系统 SHALL 支持将整个对话的所有 AI 回复批量加入图谱语料库。操作 SHALL 为该对话的每条 AI 回复创建独立的 CorpusEntry。

#### Scenario: Add entire conversation
- **WHEN** 用户在图谱面板选择「将对话 X 加入语料库」
- **THEN** 系统为对话 X 的每条 AI 回复创建一条 CorpusEntry，加入当前图谱 corpus

### Requirement: Remove corpus entry from mindmap
系统 SHALL 支持从图谱语料库中移除语料条目。移除操作 SHALL 不删除原始对话或消息数据。

#### Scenario: Remove single corpus entry
- **WHEN** 用户在语料库界面删除某条 CorpusEntry
- **THEN** 该条目从 `MindMap.corpus` 数组移除

### Requirement: Toggle corpus entry enabled state
系统 SHALL 支持切换语料条目的 `enabled` 状态。`enabled: false` 的条目 SHALL 不参与图谱生成，但保留在语料库中。

#### Scenario: Disable and re-enable corpus entry
- **WHEN** 用户关闭某条语料的启用开关
- **THEN** 该条目 `enabled` 变为 false；再次打开恢复为 true

### Requirement: Corpus entry notes
系统 SHALL 支持用户为语料条目添加备注。备注 SHALL 存储在 `CorpusEntry.note` 字段中。

### Requirement: Corpus UI in mindmap panel
系统 SHALL 在脑图面板中展示当前图谱的语料库列表。列表 SHALL 按来源对话分组折叠显示。每条语料 SHALL 显示：内容摘要（selectedText 或消息前 60 字符）、启用开关、删除按钮。有备注的条目 SHALL 显示备注指示器。

#### Scenario: Display corpus grouped by conversation
- **WHEN** 图谱有来自多个对话的语料条目
- **THEN** 列表按对话分组显示，每组可折叠

#### Scenario: Empty corpus prompt
- **WHEN** 图谱无任何语料条目
- **THEN** 显示「暂无语料，从对话中选择内容加入语料库」提示

#### Scenario: Source deleted indicator
- **WHEN** 语料条目的 messageId 指向的消息已被删除
- **THEN** 条目显示「来源已删除」标记，自动不参与生成
