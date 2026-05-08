## MODIFIED Requirements

### Requirement: Generate mindmap from conversation history
系统 SHALL 支持通过 LLM 从对话内容生成思维导图树结构。生成 SHALL 使用全量 JSON 模式输出完整树结构。生成 prompt SHALL 根据当前脑图的 `pattern` 字段注入对应的知识组织指令，指示 LLM 按特定框架组织节点结构。生成 prompt SHALL 指示 LLM 在节点中使用 `content` 字段承载 Markdown 格式内容，并在输出 JSON 中标注 `contentType: 'markdown'`。`editedByUser: true` 的节点 SHALL 在 `mergeEditedNodes` 中被保护不被覆盖。

#### Scenario: Full regeneration with pattern
- **WHEN** 脑图 pattern 为 `"tech"`，用户发送消息触发脑图生成
- **THEN** system prompt 包含技术概念模式的组织指令，LLM 按 定义→原理→场景→对比 结构输出树
