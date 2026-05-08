## REMOVED Requirements

### Requirement: Incremental update via full regeneration
**Reason**: 增量操作（`add_child`, `merge`, `delete_leaf`, `noop`）未在代码中实现。当前行为是全量重生成 + `mergeEditedNodes` 保护。该 requirement 描述的增量模式（旧树摘要、操作指令输出）与实际代码不符。
**Migration**: 无需迁移。`mergeEditedNodes` 和 `editedByUser` 保护机制是当前实际使用的方案。

### Requirement: Auto-sync mode
**Reason**: `Conversation.autoSync` 字段不存在于实际代码中。无 debounce 自动生成逻辑。
**Migration**: 无需迁移。当前行为是每条消息发送时触发脑图生成（绑定在 `doSend` 中）。

### Requirement: Manual sync trigger
**Reason**: 无独立的"更新图谱"按钮。脑图生成绑定在聊天发送流程中。
**Migration**: 无需迁移。

### Requirement: Monitored conversation auto-generation
**Reason**: 语料库（`CorpusEntry`）系统未实现。被监听对话的 AI 回复不会自动加入语料库。
**Migration**: 无需迁移。当前行为是每条消息的 system prompt 中包含现有脑图上下文 + 脑图生成指令。

### Requirement: Generation model selection
**Reason**: 无独立的图谱生成模型选择。当前使用 Conversation 的模型。
**Migration**: 无需迁移。

### Requirement: Source conversation tracking
**Reason**: `sourceConversationIds` / `sourceExcerpts` 从未被填充。`[src:convId/msgId]` 标识方案未实现。
**Migration**: 无需迁移。
