## Purpose

Enable AI-powered mindmap generation from conversation history using LLM prompts, supporting both full rebuild and incremental update modes with structured JSON output.

## Requirements

### Requirement: Generate mindmap from conversation history
系统 SHALL 支持通过 LLM 从对话内容生成思维导图树结构。输入内容 SHALL 优先使用图谱语料库内容。生成模式 SHALL 根据图谱状态自动选择：首次生成使用全量模式（输出完整 Markdown/JSON 树），后续生成使用增量模式（输出操作指令）。增量模式 SHALL 提供旧树摘要而非完整树，减少 prompt token 消耗。生成 prompt SHALL 指示 LLM 在节点中使用 `content` 字段承载 Markdown 格式内容（加粗、斜体、行内代码、删除线、代码块、表格），并在输出 JSON 中标注 `contentType: 'markdown'`。系统 SHALL 在解析 JSON 响应时识别 `contentType` 和 `content` 字段并存储到 MindMapNode。

#### Scenario: First-time generation
- **WHEN** 用户对未包含树的图谱触发生成
- **THEN** 系统使用全量模式，构建完整 prompt，LLM 输出完整树结构

#### Scenario: Incremental generation
- **WHEN** 图谱已有树结构，用户传入新内容触发生成
- **THEN** 系统使用增量模式，提供旧树摘要，LLM 输出操作指令

#### Scenario: AI generates node with markdown content
- **WHEN** 语料包含代码示例，且生成模式为全量或增量
- **THEN** LLM 输出的节点可能包含带 `contentType: 'markdown'` 的 `content` 字段（含代码块或表格）
- **AND** 系统正确解析并存储 `contentType` 和 `content` 字段

### Requirement: Markdown to tree parsing
系统 SHALL 将 LLM 返回的 Markdown 文本解析为 MindMapNode 树结构。解析规则：
- `# 标题` → 根节点（Tree 数组中添加一项）
- `## 标题` → 根节点的直接子节点
- `### 标题` → 二级子节点
- 标题中包含 `—` 时，`—` 之前为 label，之后为 summary
- 非标题行作为其上方最近节点的 summary 累积

#### Scenario: Parse well-formed markdown
- **WHEN** LLM 返回标准 Markdown 标题结构（# / ## / ###）
- **THEN** 系统正确解析为三层嵌套的 MindMapNode 树，每个节点的 label 和 summary 正确提取

#### Scenario: Parse markdown with separator
- **WHEN** LLM 返回 `## useState — React 中最基础的状态 Hook`
- **THEN** 节点 label 为 "useState"，summary 为 "React 中最基础的状态 Hook"

#### Scenario: Parse malformed markdown
- **WHEN** LLM 返回不符合约定的文本（如没有 # 标题、嵌套超过 3 层、纯文本无结构）
- **THEN** 系统做防御性处理：忽略非标题行，超过 3 层的 ### 视为 ### 级别，不抛出异常

### Requirement: Incremental update via full regeneration
系统 SHALL 保留全量再生作为降级路径。当增量操作解析失败时，SHALL 自动降级到全量 Markdown 再生。`editedByUser: true` 的节点 SHALL 在操作执行器中被保护不被覆盖。用户 SHALL 可通过设置强制选择「全量重建」。

#### Scenario: Tree grows across multiple sessions
- **WHEN** 同一个图谱关联了 3 个 Conversation，每个对话涉及同一主题的不同方面
- **THEN** 触发同步后，增量操作整合新知识点，保持已有结构稳定

#### Scenario: Full rebuild on demand
- **WHEN** 用户在图谱设置中选择「全量重建」模式并触发生成
- **THEN** 系统使用全量 prompt 重新生成完整树

### Requirement: Generation state management
系统 SHALL 在生成过程中管理以下状态：idle、generating、complete、error。生成中 SHALL 实时渲染部分树并显示进度信息。

#### Scenario: Generating state
- **WHEN** LLM 正在生成图谱内容
- **THEN** 图谱面板显示实时更新的树结构和进度（已生成 N 个主题 · 深度 X/3）

#### Scenario: Generation error
- **WHEN** LLM 调用失败
- **THEN** 系统显示错误提示并提供"重试"按钮，保留最后一次成功渲染的树结构不变

### Requirement: Auto-sync mode
系统 SHALL 支持自动同步模式。当 Conversation 的 `autoSync` 为 true 时，每次 AI 回复完成后，系统 SHALL 在 5 秒 debounce 后自动触发图谱生成。

#### Scenario: Disable auto-sync
- **WHEN** 用户关闭 Conversation 的自动同步开关
- **THEN** 后续 AI 回复不再自动触发图谱生成，用户需手动点击"更新图谱"

### Requirement: Manual sync trigger
系统 SHALL 在思维导图面板提供「更新图谱」按钮。生成 SHALL 从图谱语料库读取启用的内容；如果语料库为空，SHALL 提示用户添加语料。

### Requirement: Monitored conversation auto-generation
被 `monitoredConversationIds` 监听的对话产生新 AI 回答时，系统 SHALL 自动将该回答加入图谱语料库，并在 5 秒 debounce 后自动触发图谱生成。

#### Scenario: Auto-generation from monitored conversation
- **WHEN** 图谱监听对话 X，对话 X 中 AI 完成回复
- **THEN** 系统自动创建 CorpusEntry 加入图谱 corpus，5 秒后触发图谱生成

### Requirement: Generation model selection
系统 SHALL 允许用户为图谱生成指定使用的模型。默认 SHALL 使用当前 Conversation 的模型。用户 SHALL 可在图谱设置中覆盖为任意可用模型。

### Requirement: Depth and breadth constraints
系统 SHALL 限制图谱生成的树深度（最多 N 层，N 由图谱的 `maxDepth` 配置决定，默认为 3，可配置为 1-5 或自动模式）和每层节点数（最多 10 个直接子节点）。LLM prompt 中 SHALL 明确这些限制。

#### Scenario: Max depth enforcement at configured depth
- **WHEN** 图谱 `maxDepth` 为 4，LLM 返回超过 4 层的标题（如 #####）
- **THEN** 解析器忽略第五层及更深层的标题

#### Scenario: Breadth constraint enforcement
- **WHEN** LLM 返回某个节点超过 10 个直接子节点
- **THEN** 系统仅保留前 10 个，超出部分忽略

#### Scenario: Auto mode depth
- **WHEN** 图谱为自动模式（maxDepth = 0），LLM 返回任意深度内容
- **THEN** prompt 不指定层数限制，解析器安全上限为 6 层

### Requirement: Few-shot prompt examples
系统 SHALL 在 LLM system prompt 中包含高质量示例，展示按概念维度分类的树结构和内容风格。

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
