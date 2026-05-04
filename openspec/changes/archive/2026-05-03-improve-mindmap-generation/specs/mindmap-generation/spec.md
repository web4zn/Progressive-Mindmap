## MODIFIED Requirements

### Requirement: Generate mindmap from conversation history
系统 SHALL 支持通过 LLM 从对话内容生成思维导图树结构。输入内容 SHALL 优先使用物料池中选中的消息文本；若物料池为空，SHALL 降级使用全部关联对话消息。系统 SHALL 将输入内容和系统提示词发送给 LLM，LLM 输出结构化 JSON（JSON mode 优先）或 Markdown 标题格式的树结构，客户端解析为 MindMapNode[] 数组。

#### Scenario: First-time generation
- **WHEN** 用户对未包含树的图谱触发生成，且物料池或关联 Conversation 包含有效内容
- **THEN** 系统按优先级收集输入内容，构建 prompt，调用 LLM，解析返回的 JSON 或 Markdown 为树节点

#### Scenario: Generation with no messages
- **WHEN** 物料池为空且关联 Conversation 无消息
- **THEN** 系统显示提示"请选择对话内容或先进行对话以生成图谱"，不执行 LLM 调用

### Requirement: Incremental update via full regeneration
系统 SHALL 在已有树结构时执行增量更新：将现有树的 Markdown 表示 + 输入内容发送给 LLM，要求 LLM 输出完整的合并后树。`editedByUser: true` 的节点 SHALL 被保留不被覆盖。

### Requirement: Generation state management
系统 SHALL 在生成过程中管理以下状态：idle、generating、complete、error。生成中 SHALL 实时渲染部分树并显示进度信息。

#### Scenario: Generating state
- **WHEN** LLM 正在生成图谱内容
- **THEN** 图谱面板显示实时更新的树结构和进度（已生成 N 个主题 · 深度 X/3）

### Requirement: Auto-sync mode
系统 SHALL 支持自动同步模式。当 Conversation 的 `autoSync` 为 true 时，每次 AI 回复完成后，系统 SHALL 在 5 秒 debounce 后自动触发图谱生成。

### Requirement: Manual sync trigger
系统 SHALL 在思维导图面板提供"更新图谱"按钮。如果物料池非空，SHALL 仅使用物料池内容；如果物料池为空，SHALL 使用全部关联对话。

## ADDED Requirements

### Requirement: Few-shot prompt examples
系统 SHALL 在 LLM system prompt 中包含高质量示例，展示期望的树结构和内容风格。

### Requirement: Structured JSON output (preferred format)
系统 SHALL 在 provider 支持时使用 JSON mode 约束 LLM 输出结构化 JSON。JSON 解析失败时 SHALL 自动降级为 Markdown 解析。

#### Scenario: JSON mode supported
- **WHEN** 当前 provider 的 `apiEndpoint` 匹配 OpenAI/DeepSeek/SiliconFlow
- **THEN** 系统使用 `response_format: { type: "json_object" }` 请求

#### Scenario: JSON parse failure fallback
- **WHEN** LLM 返回非 JSON 内容或 JSON 解析失败
- **THEN** 系统自动降级使用 Markdown 解析

### Requirement: Quality validation
系统 SHALL 在生成完成后执行质量校验：重复节点、空节点、深度超限、广度超限。警告 SHALL 以非阻塞形式显示。

### Requirement: Source conversation tracking
系统 SHALL 在生成节点时填充 `sourceConversationIds` 字段，通过 prompt 中的 `[src:convId/msgId]` 标识实现。节点解析后 SHALL 存储实际对话 ID 和消息摘录。

#### Scenario: Node without explicit attribution
- **WHEN** LLM 未标注来源
- **THEN** 节点使用输入消息列表中的最新对话 ID 作为降级来源
