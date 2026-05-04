## ADDED Requirements

### Requirement: Sidebar dark theme
侧边栏 SHALL 使用深色背景（浅色模式下为深灰、深色模式下为黑色），与浅色内容区形成视觉对比。侧边栏背景 SHALL 覆盖整个侧边栏高度，包括搜索区、列表区和底部按钮区。

#### Scenario: Sidebar appearance in light mode
- **WHEN** 系统为浅色主题
- **THEN** 侧边栏使用深灰色背景（如 bg-neutral-900/90），文字使用浅色

#### Scenario: Sidebar appearance in dark mode
- **WHEN** 系统为深色主题
- **THEN** 侧边栏使用黑色背景（如 bg-black/70）

### Requirement: Icon-driven action buttons
侧边栏中的会话操作按钮（新建、重命名、删除、导出）SHALL 使用 Lucide 图标组件而非文字。操作按钮仅在 hover 会话项时显示，默认隐藏。

#### Scenario: New conversation button
- **WHEN** 用户点击侧边栏顶部的新建按钮
- **THEN** 按钮使用 Plus 图标 + "新建对话" 文字标签

#### Scenario: Hover actions on conversation item
- **WHEN** 用户悬停在一个会话项上
- **THEN** 显示 Download / Pencil / Trash2 三个 Lucide 图标按钮

### Requirement: Improved selection state
当前激活的会话 SHALL 使用高亮背景色（如 bg-accent 或 bg-primary/10）和左侧强调条（可选）。hover 状态的会话 SHALL 使用半透明高亮背景。

#### Scenario: Active conversation highlight
- **WHEN** 用户切换到一个会话
- **THEN** 该会话项显示突出背景色，与其他未选中项形成明显对比

## MODIFIED Requirements

### Requirement: Switch conversation
系统 SHALL 提供会话列表侧边栏，用户可点击切换到不同的会话。侧边栏 SHALL 使用深色背景，会话项使用 Lucide 图标操作按钮。切换会话时 SHALL 保存当前会话状态，加载目标会话的消息历史。

#### Scenario: Switch between conversations
- **WHEN** 用户在侧边栏点击另一个会话
- **THEN** 当前会话状态保存，目标会话的消息历史加载到对话区域，模型选择器切换到该会话关联的模型，被选中的会话项高亮显示

#### Scenario: Switch during generation
- **WHEN** 用户在 AI 响应生成期间切换到另一个会话
- **THEN** 当前会话的生成继续在后台进行，用户切换回时显示完整响应
