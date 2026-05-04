## ADDED Requirements

### Requirement: Message input and submission
系统 SHALL 提供消息输入区域，用户可输入文本并提交发送给当前选中的 LLM 模型。提交方式 SHALL 支持点击发送按钮和 Enter 键。Shift+Enter SHALL 插入换行而非提交。输入区域 SHALL 支持多行文本，并随内容自动调整高度。

#### Scenario: User sends message via Enter key
- **WHEN** 用户在输入框中输入文本并按 Enter 键
- **THEN** 系统将消息发送给当前选中的 LLM 模型，清空输入框，并显示用户消息在对话区

#### Scenario: User inserts newline with Shift+Enter
- **WHEN** 用户在输入框中按 Shift+Enter
- **THEN** 系统在输入框中插入换行符，不触发消息提交

#### Scenario: User sends message via button
- **WHEN** 用户点击发送按钮
- **THEN** 系统将输入框中的文本发送给当前选中的 LLM 模型

#### Scenario: Empty message prevention
- **WHEN** 用户尝试提交空白消息（仅含空格或换行）
- **THEN** 系统不发送消息，输入框保持原状

### Requirement: Streaming response display
系统 SHALL 以流式方式显示 LLM 的响应内容，逐字或逐 token 渲染到对话区域。流式输出期间 SHALL 显示加载状态指示器（如光标闪烁）。当流式传输完成时，系统 SHALL 停止加载指示器。

#### Scenario: Streaming response rendering
- **WHEN** LLM 返回流式响应
- **THEN** 系统逐 token 将内容渲染到消息气泡中，用户可实时看到生成过程

#### Scenario: Stream completion
- **WHEN** 流式响应传输完成
- **THEN** 系统移除加载指示器，完整消息渲染为最终格式

#### Scenario: Stream interruption
- **WHEN** 流式响应因网络错误中断
- **THEN** 系统保留已接收的部分内容，显示错误提示，并提供"重新生成"选项

### Requirement: Markdown rendering
系统 SHALL 将 LLM 响应中的 Markdown 语法正确渲染为富文本。支持的标准 SHALL 包括：标题、加粗、斜体、代码块（带语法高亮）、行内代码、列表（有序/无序）、表格、链接、引用块。

#### Scenario: Code block with syntax highlighting
- **WHEN** LLM 返回包含代码块的 Markdown 响应
- **THEN** 系统渲染代码块并应用语法高亮，代码块包含语言标签和复制按钮

#### Scenario: Table rendering
- **WHEN** LLM 返回包含 Markdown 表格的响应
- **THEN** 系统将表格正确渲染为 HTML 表格，包含表头和单元格边框

### Requirement: Message display and layout
系统 SHALL 将对话消息以气泡形式展示，用户消息和 AI 回复 SHALL 使用不同的视觉样式（颜色/位置）区分。消息 SHALL 按时间顺序从上到下排列。当新消息到达时，对话区域 SHALL 自动滚动到底部。

#### Scenario: Message visual differentiation
- **WHEN** 对话中包含用户消息和 AI 消息
- **THEN** 用户消息和 AI 消息使用不同的背景色和/或对齐方式展示

#### Scenario: Auto-scroll on new message
- **WHEN** 新的 AI 回复开始流式输出
- **THEN** 对话区域自动滚动到底部以展示最新内容

#### Scenario: User manually scrolled up
- **WHEN** 用户手动向上滚动对话区域，且新的 AI 回复正在生成
- **THEN** 系统显示"滚动到底部"按钮，不强制自动滚动；用户点击后滚动到底部

### Requirement: Message actions
系统 SHALL 为每条消息提供操作按钮：复制消息内容、对 AI 回复重新生成。

#### Scenario: Copy message content
- **WHEN** 用户点击消息的复制按钮
- **THEN** 消息的纯文本内容被复制到剪贴板，显示复制成功提示

#### Scenario: Regenerate AI response
- **WHEN** 用户点击 AI 回复的重新生成按钮
- **THEN** 系统删除当前 AI 回复，基于相同的用户消息重新请求 LLM 生成回复

### Requirement: Stop generation
系统 SHALL 在 LLM 生成响应期间提供"停止生成"按钮。点击后 SHALL 立即终止流式传输，保留已生成的部分内容。

#### Scenario: User stops generation
- **WHEN** 用户在 AI 响应生成期间点击停止按钮
- **THEN** 流式传输立即终止，已生成的部分内容保留显示，停止指示器变为重新生成按钮
