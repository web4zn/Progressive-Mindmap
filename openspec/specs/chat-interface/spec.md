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

> 注：当前 ChatPage.doSend 使用非流式 `chat()`（`stream: false`），流式生成函数 `streamChat` 已存在于 `llm-client.ts` 但未被调用。此 requirement 描述的是目标行为。

#### Scenario: Streaming response rendering
- **WHEN** LLM 返回流式响应
- **THEN** 系统逐 token 将内容渲染到消息气泡中，用户可实时看到生成过程

#### Scenario: Stream completion
- **WHEN** 流式响应传输完成
- **THEN** 系统移除加载指示器，完整消息渲染为最终格式

### Requirement: Markdown rendering
系统 SHALL 将 LLM 响应中的 Markdown 语法正确渲染为富文本。支持的标准 SHALL 包括：标题、加粗、斜体、代码块、行内代码、列表（有序/无序）、表格、链接、引用块。

#### Scenario: Code block rendering
- **WHEN** LLM 返回包含代码块的 Markdown 响应
- **THEN** 系统渲染代码块（使用 `@tailwindcss/typography` 样式），代码块包含语言标签

#### Scenario: Table rendering
- **WHEN** LLM 返回包含 Markdown 表格的响应
- **THEN** 系统将表格正确渲染为 HTML 表格，包含表头和单元格边框

### Requirement: Message display and layout
系统 SHALL 将对话消息以气泡形式展示，用户消息和 AI 回复 SHALL 使用不同的视觉样式区分。每个消息气泡 SHALL 附带对应的圆形头像（用户首字母/AI 图标）。消息 SHALL 按时间顺序从上到下排列，在 max-w-3xl 区域内居中。当新消息到达时，对话区域 SHALL 自动滚动到底部。

#### Scenario: Message visual differentiation with avatar
- **WHEN** 对话中包含用户消息和 AI 消息
- **THEN** 用户消息使用蓝色主题色 + 用户首字母头像，AI 消息使用灰色背景 + Bot 图标头像

#### Scenario: Auto-scroll on new message
- **WHEN** 新的 AI 回复开始流式输出
- **THEN** 对话区域自动滚动到底部以展示最新内容

#### Scenario: User manually scrolled up
- **WHEN** 用户手动向上滚动对话区域，且新的 AI 回复正在生成
- **THEN** 系统显示"滚动到底部"按钮，不强制自动滚动；用户点击后滚动到底部

### Requirement: Message actions
系统 SHALL 为每条消息在 hover 时显示操作按钮行。操作按钮 SHALL 使用 Lucide 图标：复制（Copy 图标）、重新生成（RefreshCw 图标）。操作栏 SHALL 在鼠标离开消息区域后淡出（200ms 过渡）。

#### Scenario: Copy message content
- **WHEN** 用户悬停在消息上并点击复制按钮（Copy 图标）
- **THEN** 消息的纯文本内容被复制到剪贴板，按钮显示短暂的成功反馈

#### Scenario: Regenerate AI response
- **WHEN** 用户点击 AI 回复的重新生成按钮（RefreshCw 图标）
- **THEN** 系统删除当前 AI 回复，基于相同的用户消息重新请求 LLM 生成回复

### Requirement: Stop generation
系统 SHALL 在 LLM 生成响应期间提供"停止生成"按钮。点击后 SHALL 立即终止流式传输，保留已生成的部分内容。系统 SHALL 正确检测 OpenAI SDK 的 abort 错误（通过 `isAbortError` 工具函数综合判断 AbortSignal 状态、错误 cause 链、以及 APIError 消息），不应仅依赖错误类型的 name 属性匹配。

#### Scenario: User stops generation
- **WHEN** 用户在 AI 响应生成期间点击停止按钮
- **THEN** 流式传输立即终止，已生成的部分内容保留显示且状态为 complete，停止按钮消失

#### Scenario: Abort detection
- **WHEN** 流式传输因 AbortSignal 被中止
- **THEN** 系统通过 `isAbortError` 正确检测到中止，不将中止错误标记为错误

### Requirement: Persistent layout shell
系统 SHALL 始终渲染完整的应用布局框架（侧边栏 + 顶栏 + 内容区 + 输入栏），无论应用处于何种状态（无提供商、有提供商无会话、有会话）。当思维导图面板全局开关开启时，右侧 SHALL 额外显示图谱面板。状态变化 SHALL 通过内容区内部组件表达，而非切换整个页面。

#### Scenario: No providers — still shows layout
- **WHEN** 用户首次打开应用且未配置任何模型提供商
- **THEN** 侧边栏、顶栏、内容区（显示欢迎空状态）、输入栏（禁用）均可见；图谱面板默认隐藏

#### Scenario: Providers but no conversation — input enabled
- **WHEN** 用户已配置提供商但未创建任何会话
- **THEN** 内容区显示"开始新对话"空状态，输入栏可输入；图谱面板默认隐藏

#### Scenario: Mindmap panel visible in layout
- **WHEN** 用户开启图谱面板全局开关
- **THEN** 右侧显示图谱面板，侧边栏和聊天区可见且内容区宽度根据面板宽度动态调整

### Requirement: Empty state — welcome card
当未配置任何模型提供商时，内容区 SHALL 显示品牌化的欢迎卡片。卡片 SHALL 包含：应用图标（Lucide）、标题"欢迎使用 LLM Chat"、描述文字、CTA 按钮"配置模型提供商"、流行模型提供商推荐标签（OpenAI / DeepSeek / Ollama / SiliconFlow）。

#### Scenario: Welcome card content
- **WHEN** 用户首次进入且无提供商
- **THEN** 内容区展示品牌欢迎卡片，点击"配置模型提供商"跳转到提供商设置页

### Requirement: Message avatar
每条消息 SHALL 在气泡旁显示圆形头像。用户消息 SHALL 显示首字母（蓝色背景），AI 消息 SHALL 显示 Bot 图标（灰色/紫色背景）。头像 SHALL 始终可见，不随 hover 状态变化。

#### Scenario: User message avatar
- **WHEN** 用户发送消息
- **THEN** 消息气泡左侧显示用户首字母圆形头像

#### Scenario: AI message avatar
- **WHEN** AI 回复消息
- **THEN** 消息气泡左侧显示 Bot 图标圆形头像

### Requirement: Centered content area
聊天消息列表和输入栏 SHALL 在宽屏下限制最大宽度并居中显示。当图谱面板可见时，最大宽度 SHALL 根据可用空间动态调整以保持视觉平衡。窄屏下 SHALL 自动适配全宽。

#### Scenario: Wide screen centering without panel
- **WHEN** 用户在大屏幕（≥1024px）上使用应用，图谱面板隐藏
- **THEN** 消息列表和输入栏在水平方向居中，最大宽度为 max-w-lg，两侧保留空白

#### Scenario: Wide screen centering with panel
- **WHEN** 用户在大屏幕（≥1024px）上使用应用，图谱面板可见
- **THEN** 消息列表和输入栏在聊天区剩余空间内显示，面板占 flex-1

#### Scenario: Narrow screen full width
- **WHEN** 用户在小屏幕（<768px）上使用应用
- **THEN** 图谱面板隐藏，消息列表和输入栏占满可用宽度
