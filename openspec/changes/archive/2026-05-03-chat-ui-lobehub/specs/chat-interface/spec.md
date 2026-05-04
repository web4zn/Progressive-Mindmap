## ADDED Requirements

### Requirement: Persistent layout shell
系统 SHALL 始终渲染完整的应用布局框架（侧边栏 + 顶栏 + 内容区 + 输入栏），无论应用处于何种状态（无提供商、有提供商无会话、有会话）。状态变化 SHALL 通过内容区内部组件表达，而非切换整个页面。

#### Scenario: No providers — still shows layout
- **WHEN** 用户首次打开应用且未配置任何模型提供商
- **THEN** 侧边栏、顶栏、内容区（显示欢迎空状态）、输入栏（禁用）均可见

#### Scenario: Providers but no conversation — input enabled
- **WHEN** 用户已配置提供商但未创建任何会话
- **THEN** 内容区显示"开始新对话"空状态，输入栏可输入

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
聊天消息列表和输入栏 SHALL 在宽屏下限制最大宽度（max-w-3xl）并居中显示。窄屏下 SHALL 自动适配全宽。

#### Scenario: Wide screen centering
- **WHEN** 用户在大屏幕（≥1024px）上使用应用
- **THEN** 消息列表和输入栏在水平方向居中，两侧保留空白

#### Scenario: Narrow screen full width
- **WHEN** 用户在小屏幕（<768px）上使用应用
- **THEN** 消息列表和输入栏占满可用宽度

## MODIFIED Requirements

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
