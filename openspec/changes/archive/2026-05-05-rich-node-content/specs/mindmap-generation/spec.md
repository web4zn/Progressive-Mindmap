## MODIFIED Requirements

### Requirement: Generate mindmap from conversation history
系统 SHALL 支持通过 LLM 从对话内容生成思维导图树结构。输入内容 SHALL 优先使用图谱语料库内容。生成 prompt SHALL 指示 LLM 在节点 summary 中使用 Markdown 格式表达富内容（图片、链接、代码块、LaTeX 公式），并在输出 JSON 中标注 `contentType: 'markdown'`。系统 SHALL 在解析 JSON 响应时识别 `contentType` 字段并存储到 MindMapNode。

#### Scenario: AI generates node with markdown content
- **WHEN** 语料包含代码示例或公式，且生成模式为全量或增量
- **THEN** LLM 输出的节点 summary 可能包含 Markdown 格式的代码块或公式
- **AND** 系统正确解析并存储 `contentType` 和 `content` 字段
