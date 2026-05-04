## MODIFIED Requirements

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

### Requirement: Centered content area
聊天消息列表和输入栏 SHALL 在宽屏下限制最大宽度并居中显示。当图谱面板可见时，最大宽度 SHALL 根据可用空间动态调整以保持视觉平衡。窄屏下 SHALL 自动适配全宽。

#### Scenario: Wide screen centering without panel
- **WHEN** 用户在大屏幕（≥1024px）上使用应用，图谱面板隐藏
- **THEN** 消息列表和输入栏在水平方向居中，最大宽度为 max-w-3xl，两侧保留空白

#### Scenario: Wide screen centering with panel
- **WHEN** 用户在大屏幕（≥1024px）上使用应用，图谱面板可见
- **THEN** 消息列表和输入栏在聊天区剩余空间内居中，最大宽度适配至 max-w-2xl 或更窄以保持可读性

#### Scenario: Narrow screen full width
- **WHEN** 用户在小屏幕（<768px）上使用应用
- **THEN** 图谱面板隐藏，消息列表和输入栏占满可用宽度
