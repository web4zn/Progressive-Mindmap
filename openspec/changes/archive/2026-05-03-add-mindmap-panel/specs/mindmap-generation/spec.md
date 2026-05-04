## ADDED Requirements

### Requirement: Generate mindmap from conversation history
系统 SHALL 支持通过 LLM 从对话历史生成思维导图树结构。生成时 SHALL 将对话消息列表和系统提示词发送给 LLM，LLM 输出 Markdown 标题格式的树结构，客户端解析为 MindMapNode[] 数组。

#### Scenario: First-time generation
- **WHEN** 用户对未包含树的图谱触发生成，且有关联的 Conversation 包含对话消息
- **THEN** 系统收集对话消息，构建 prompt，调用 LLM，解析返回的 Markdown 为树节点，存储到图谱的 tree 字段

#### Scenario: Generation with no messages
- **WHEN** 用户对未包含树的图谱触发生成，但关联的 Conversation 中没有任何消息
- **THEN** 系统显示提示"请先进行对话以生成图谱"，不执行 LLM 调用

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
系统 SHALL 在已有树结构时执行增量更新：将现有树的 Markdown 表示 + 所有关联 Conversation 的消息发送给 LLM，要求 LLM 输出完整的合并后树。系统 SHALL 用新树替换旧树。

#### Scenario: Add content from new conversation
- **WHEN** 图谱已有树结构，用户关联了一个新的 Conversation 并触发同步
- **THEN** 系统将现有树（转为 Markdown）和新对话消息一并发送，LLM 输出合并后的完整树

#### Scenario: Tree grows across multiple sessions
- **WHEN** 同一个图谱关联了 3 个 Conversation，每个对话涉及同一主题的不同方面
- **THEN** 触发同步后，生成的树整合了所有 3 个对话的知识点，形成统一结构

### Requirement: Generation state management
系统 SHALL 在生成过程中管理以下状态：idle（空闲）、generating（生成中）、complete（完成）、error（错误）。用户界面 SHALL 根据状态显示对应的指示器。

#### Scenario: Generating state
- **WHEN** LLM 正在生成图谱内容
- **THEN** 图谱面板显示"正在生成..."加载状态，同步按钮禁用

#### Scenario: Generation error
- **WHEN** LLM 调用失败（网络错误、API 错误、解析失败）
- **THEN** 系统显示错误提示并提供"重试"按钮，保留已有树结构不变

#### Scenario: Generation complete
- **WHEN** LLM 生成完成且解析成功
- **THEN** 图谱面板渲染新树结构，同步按钮恢复可用

### Requirement: Auto-sync mode
系统 SHALL 支持自动同步模式。当 Conversation 的 `autoSync` 为 true 时，每次 AI 回复完成后，系统 SHALL 在 3 秒 debounce 后自动触发图谱生成。生成使用与手动同步相同的管道。

#### Scenario: Auto-sync after AI reply
- **WHEN** Conversation 开启自动同步，AI 回复完成
- **THEN** 系统等待 3 秒（期间有新回复则重置计时），然后自动调用图谱生成

#### Scenario: Disable auto-sync
- **WHEN** 用户关闭 Conversation 的自动同步开关
- **THEN** 后续 AI 回复不再自动触发图谱生成，用户需手动点击"更新图谱"

### Requirement: Manual sync trigger
系统 SHALL 在思维导图面板工具栏提供"更新图谱"按钮。点击后 SHALL 立即触发一次图谱生成。

#### Scenario: Manual trigger
- **WHEN** 用户点击"更新图谱"按钮
- **THEN** 系统立即执行图谱生成管道，更新当前活跃图谱的内容

### Requirement: Generation model selection
系统 SHALL 允许用户为图谱生成指定使用的模型。默认 SHALL 使用当前 Conversation 的模型。用户 SHALL 可在图谱设置中覆盖为任意可用模型。

#### Scenario: Default model selection
- **WHEN** 用户未指定专用的生成模型
- **THEN** 系统使用当前活跃 Conversation 的模型进行图谱生成

#### Scenario: Custom generation model
- **WHEN** 用户在图谱设置中指定了专用的生成模型
- **THEN** 图谱生成使用该指定模型，不影响对话使用的模型

### Requirement: Depth and breadth constraints
系统 SHALL 限制图谱生成的树深度（最多 3 层）和每层节点数（最多 10 个直接子节点）。LLM prompt 中 SHALL 明确这些限制。

#### Scenario: Max depth enforcement
- **WHEN** LLM 返回超过 3 层的标题（如 ####）
- **THEN** 解析器忽略第四层及更深层的标题

#### Scenario: Breadth constraint enforcement
- **WHEN** LLM 返回某个节点超过 10 个直接子节点
- **THEN** 系统仅保留前 10 个，超出部分忽略
