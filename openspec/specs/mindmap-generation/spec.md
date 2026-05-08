## Purpose

Enable AI-powered mindmap generation from conversation history using LLM prompts with structured JSON output, supporting full tree rebuild with edited-node preservation.

## Requirements

### Requirement: Generate mindmap from conversation history
系统 SHALL 支持通过 LLM 从对话内容生成思维导图树结构。生成 SHALL 使用全量 JSON 模式输出完整树结构。生成 prompt SHALL 指示 LLM 在节点中使用 `content` 字段承载 Markdown 格式内容（加粗、斜体、行内代码、删除线、代码块、表格），并在输出 JSON 中标注 `contentType: 'markdown'`。系统 SHALL 在解析 JSON 响应时识别 `contentType` 和 `content` 字段并存储到 MindMapNode。`editedByUser: true` 的节点 SHALL 在 `mergeEditedNodes` 中被保护不被覆盖。

#### Scenario: Full regeneration from conversation
- **WHEN** 用户发送消息触发脑图生成
- **THEN** 系统构建包含现有树上下文的 prompt，LLM 输出完整树结构，`mergeEditedNodes` 保护用户编辑

#### Scenario: AI generates node with markdown content
- **WHEN** 语料包含代码示例
- **THEN** LLM 输出的节点可能包含带 `contentType: 'markdown'` 的 `content` 字段（含代码块或表格）
- **AND** 系统正确解析并存储 `contentType` 和 `content` 字段

### Requirement: Generation state management
系统 SHALL 在生成过程中管理以下状态：idle、generating、complete、error。生成中 SHALL 显示加载指示器。

#### Scenario: Generating state
- **WHEN** LLM 正在生成图谱内容
- **THEN** 图谱面板显示加载动画（骨架屏）

#### Scenario: Generation error
- **WHEN** LLM 调用失败
- **THEN** 系统显示错误提示，保留最后一次成功渲染的树结构不变

### Requirement: Depth and breadth constraints
系统 SHALL NOT 在解析阶段对 LLM 生成的脑图施加硬编码深度上限或每节点子节点数量上限。`parseJsonToTree` 和 `jsonNodeToMindMapNode` SHALL 接受 LLM 返回的任意深度树结构和任意子节点数量，不做截断。

`mindmapTreeToContext` 中的 `maxNodes=200` 序列化截断 SHALL 保持不变（这是 prompt 上下文限制，而非树结构限制）。

#### Scenario: LLM returns deep tree beyond old limit
- **WHEN** LLM 返回 8 层深的树结构
- **THEN** 解析器完整保留所有 8 层节点，不做截断

#### Scenario: LLM returns many children per node
- **WHEN** LLM 返回某个节点有 15 个直接子节点
- **THEN** 解析器完整保留所有 15 个子节点，不做截断

#### Scenario: Existing tree data unaffected
- **WHEN** 旧持久化数据被加载
- **THEN** 系统正常渲染，现有树结构不受影响

### Requirement: Few-shot prompt examples
系统 SHALL 在 LLM system prompt 中包含高质量示例，展示按概念维度分类的树结构和内容风格。

> 注：当前 `buildFullMindmapPrompt()` 未包含 few-shot 示例，仅有结构指令。此为待实现的优化。

### Requirement: Structured JSON output (preferred format)
系统 SHALL 始终使用 JSON mode 约束 LLM 输出结构化 JSON（当 provider 支持 `response_format: json_object` 时）。系统 SHALL NOT 使用 `<!--MINDMAP-->` HTML 注释标记模式。JSON 解析 SHALL 直接使用 `JSON.parse`，不做多阶段容错修复或 Markdown 回退。解析失败时 SHALL 保持当前树不变。

#### Scenario: JSON mode supported
- **WHEN** 当前 provider 的 `apiEndpoint` 匹配已知支持列表（OpenAI/DeepSeek/SiliconFlow/OpenRouter/Google）
- **THEN** 系统使用 `response_format: { type: "json_object" }` 请求

#### Scenario: JSON parse failure
- **WHEN** LLM 返回非 JSON 内容或 JSON 解析失败
- **THEN** 系统保持当前树结构不变，不触发树更新

### Requirement: Quality validation
系统 SHALL 在生成完成后执行质量校验：重复节点、空节点。警告 SHALL 以非阻塞形式显示。

> 注：当前未实现生成后质量校验逻辑。

#### Scenario: Duplicate node detected
- **WHEN** 生成结果包含 label 完全相同的同级节点
- **THEN** 系统输出警告但不自动修改树结构
