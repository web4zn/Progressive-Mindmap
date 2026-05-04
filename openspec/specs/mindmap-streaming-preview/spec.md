## ADDED Requirements

### Requirement: Real-time tree update during generation
系统 SHALL 在 LLM 流式返回内容时，每收到一个 chunk 后实时解析当前累积的完整文本为 MindMapNode 树并更新渲染。更新 SHALL 使用 150ms 防抖以避免过度渲染。

#### Scenario: First chunk renders root node
- **WHEN** LLM 开始流式返回，第一个 chunk 包含 `# React Hooks`
- **THEN** 树视图中立即显示根节点 "React Hooks"，状态为「生成中…」

#### Scenario: Subsequent chunks add child nodes
- **WHEN** LLM 继续返回 `## useState`、`### 基本用法`
- **THEN** 树视图实时扩展：根节点下出现子节点 "useState"，其下展开 "基本用法"

#### Scenario: Partial markdown produces incomplete tree
- **WHEN** LLM 返回不完整的 Markdown（如 `## useState —— 状态管理 Hook\n###` 后中断）
- **THEN** 解析器产出可渲染的部分树（"useState" 节点存在，其下子节点待后续文本补全）

### Requirement: Generation progress indicator
系统 SHALL 在脑图生成过程中显示进度信息。进度信息 SHALL 包含：已生成的节点总数、当前最大深度层级。

#### Scenario: Show progress during generation
- **WHEN** 生成过程已产出 12 个节点，最大深度为 2 层
- **THEN** 面板顶部显示「已生成 12 个主题 · 深度 2/3」

### Requirement: Reasoning content display
对于支持 reasoning 的模型（如 deepseek-reasoner），系统 SHALL 提取 `reasoning_content` 并在脑图面板中展示为可折叠的「AI 思考过程」区域。折叠默认状态为展开。

#### Scenario: Show reasoning content
- **WHEN** LLM 流式返回中包含 `reasoning_content` delta
- **THEN** 系统在脑图面板顶部渲染可折叠区域，标题为「AI 思考过程」，内容为 reasoning 文本

#### Scenario: No reasoning content
- **WHEN** LLM 流式返回中不含 `reasoning_content`
- **THEN** 不渲染思考过程区域，不显示空白占位

### Requirement: Stream interruption handling
系统 SHALL 在流式解析失败（如 parseMarkdownToTree 抛出异常）时继续尝试后续 chunk 的解析，不中断整个生成流程。最终 SHALL 使用最后一次成功解析的树作为结果。

#### Scenario: Intermediate parse fails
- **WHEN** 某个 chunk 的累积文本导致 parseMarkdownToTree 抛出异常
- **THEN** 系统忽略该次解析失败，保留上一次成功解析的树继续渲染，等待后续 chunk 重试
