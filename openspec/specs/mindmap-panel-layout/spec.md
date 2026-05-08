## Purpose

脑图面板的布局、工具栏、会话关联及交互规范。

## Requirements

### Requirement: Right panel layout
系统 SHALL 在主内容区右侧提供思维导图面板。面板 SHALL 位于侧边栏和聊天区之后，形成三栏布局。面板 SHALL 通过顶栏 Network 图标按钮切换显示/隐藏。

#### Scenario: Panel visible
- **WHEN** 用户点击顶栏 Network 图标开启面板
- **THEN** 右侧显示图谱面板，聊天区收缩以适应面板

#### Scenario: Panel hidden
- **WHEN** 用户点击顶栏 Network 图标关闭面板
- **THEN** 右侧图谱面板隐藏，聊天区恢复完整宽度

### Requirement: Global toggle button
系统 SHALL 在聊天区顶栏提供图谱面板的开关按钮（Network 图标）。面板 SHALL 默认显示。

### Requirement: Panel toolbar
系统 SHALL 在思维导图面板顶部提供工具栏：
- **图谱选择器**: 下拉菜单（shadcn Select），列出所有已创建的图谱，切换时更新活跃图谱
- **全屏按钮**: Maximize2/Minimize2 图标，fixed inset-0 z-50 覆盖全屏
- **导出下拉菜单**: Download 图标 + DropdownMenu，包含 PNG 1x / PNG 2x / PNG 3x / SVG / Markdown
- **关闭按钮**: X 图标，隐藏面板

#### Scenario: Export dropdown menu
- **WHEN** 用户点击导出下拉按钮
- **THEN** 展开菜单显示 PNG 1x、PNG 2x、PNG 3x、SVG、Markdown 五个选项

### Requirement: Conversation linking area
系统 SHALL 在面板工具栏下方提供「关联会话」可折叠区域。显示已关联的会话列表（当前 Conversation 标注"(当前)"）。提供「关联当前」按钮（Link2 图标）将当前活跃 Conversation 关联到图谱，以及每个已关联项的取消关联按钮（X 图标）。关联的 Conversation 的 AI 回复会自动触发脑图生成。

#### Scenario: Link current conversation
- **WHEN** 用户点击「关联当前」按钮
- **THEN** 当前活跃 Conversation 的 ID 被添加到图谱的 `monitoredConversationIds` 数组

#### Scenario: Unlink conversation
- **WHEN** 用户悬停在已关联会话上并点击 X 按钮
- **THEN** 该 Conversation 从 `monitoredConversationIds` 中移除

### Requirement: Node count display
系统 SHALL 在面板工具栏中显示当前图谱的节点总数（递归统计所有层级的节点）。

### Requirement: Responsive behavior
系统 SHALL 在小屏幕（<768px）下隐藏思维导图面板（`hidden md:block`）。

### Requirement: New conversation dialog with mindmap association
系统 SHALL 在用户创建新对话时弹出 NewConversationDialog，允许用户选择关联到已有图谱（下拉选择）或输入名称创建新图谱。
