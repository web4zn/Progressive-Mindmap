## MODIFIED Requirements

### Requirement: Generate mindmap from conversation history
系统 SHALL 支持通过 LLM 从图谱语料库内容生成思维导图树结构。生成 SHALL 从 `mindmap.corpus` 中收集所有 `enabled: true` 的 CorpusEntry。对于每个条目，SHALL 通过 `messageId` 从 `conversationStore` 查找对应 Message：

- 有 `selectedText` 时 SHALL 使用片段内容
- 无 `selectedText` 时 SHALL 使用整条消息内容（截断至 2000 字符）
- 有 `range` 时 SHALL 优先从 Message.content 通过 range 实时截取，校验一致性

系统 SHALL 将收集到的内容和系统提示词发送给 LLM，LLM 输出结构化 JSON（JSON mode 优先）或 Markdown 标题格式的树结构，客户端解析为 MindMapNode[] 数组。

若语料库为空，系统 SHALL 显示提示「请先将内容加入语料库」，不执行 LLM 调用。

#### Scenario: Generation from corpus
- **WHEN** 图谱语料库包含 3 条 enabled 的 CorpusEntry，用户点击「更新图谱」
- **THEN** 系统从 corpus 收集内容，构建 prompt，调用 LLM 生成

#### Scenario: Generation with disabled entries
- **WHEN** 图谱语料库包含 5 条 CorpusEntry，其中 2 条 enabled: false
- **THEN** 系统仅收集 3 条 enabled 的条目内容

#### Scenario: Generation with text fragment
- **WHEN** CorpusEntry 包含 selectedText
- **THEN** 系统仅使用 selectedText 内容，不包含该消息的其他部分

#### Scenario: Generation with empty corpus
- **WHEN** 图谱语料库为空
- **THEN** 系统显示提示「请先将内容加入语料库」，不执行 LLM 调用

#### Scenario: Source message deleted
- **WHEN** CorpusEntry 的 messageId 对应的 Message 已被删除
- **THEN** 系统跳过该条目，在语料列表中标记「来源已删除」

### Requirement: Manual sync trigger
系统 SHALL 在思维导图面板提供「更新图谱」按钮。生成 SHALL 从图谱语料库读取启用的内容；如果语料库为空，SHALL 提示用户添加语料。

### Requirement: Monitored conversation auto-generation
被 `monitoredConversationIds` 监听的对话产生新 AI 回答时，系统 SHALL 自动将该回答加入图谱语料库，并在 5 秒 debounce 后自动触发图谱生成。

#### Scenario: Auto-generation from monitored conversation
- **WHEN** 图谱监听对话 X，对话 X 中 AI 完成回复
- **THEN** 系统自动创建 CorpusEntry 加入图谱 corpus，5 秒后触发图谱生成
