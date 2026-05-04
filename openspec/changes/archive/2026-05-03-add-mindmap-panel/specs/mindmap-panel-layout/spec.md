## ADDED Requirements

### Requirement: Right panel layout
系统 SHALL 在主内容区右侧提供思维导图面板。面板 SHALL 位于侧边栏和聊天区之后，形成三栏布局（侧边栏 / 聊天区 / 图谱面板）。面板 SHALL 仅在全局开关开启时显示。

#### Scenario: Panel visible
- **WHEN** 用户开启全局图谱面板开关
- **THEN** 右侧显示图谱面板（默认宽度 350px），聊天区收缩以适应面板

#### Scenario: Panel hidden
- **WHEN** 用户关闭全局图谱面板开关
- **THEN** 右侧图谱面板隐藏，聊天区恢复完整宽度，布局与修改前一致

### Requirement: Resizable panel
系统 SHALL 允许用户通过拖动面板左侧分隔线调整面板宽度。宽度范围 SHALL 为 200px-600px。拖动过程中 SHALL 实时更新宽度和聊天区大小。

#### Scenario: Drag to resize wider
- **WHEN** 用户向左拖动分隔线
- **THEN** 面板宽度增大，聊天区宽度减小，面板宽度不小于 600px

#### Scenario: Drag to resize narrower
- **WHEN** 用户向右拖动分隔线
- **THEN** 面板宽度减小，聊天区宽度增大，面板宽度不小于 200px

#### Scenario: Drag handle visual feedback
- **WHEN** 用户鼠标悬停在分隔线上
- **THEN** 分隔线显示高亮颜色，光标变为 col-resize

### Requirement: Global toggle button
系统 SHALL 在聊天区顶栏提供全局图谱面板的开关按钮。按钮 SHALL 使用 Lucide 图标（面板打开时显示 PanelRightClose，关闭时显示 PanelRightOpen）。按钮状态 SHALL 在页面刷新后保持（通过 local state，不持久化）。

#### Scenario: Toggle panel on
- **WHEN** 当前面板隐藏，用户点击顶栏的图谱开关按钮
- **THEN** 右侧面板打开（默认宽度 350px），按钮图标切换为关闭状态

#### Scenario: Toggle panel off
- **WHEN** 当前面板显示，用户点击顶栏的图谱开关按钮
- **THEN** 右侧面板隐藏，按钮图标切换为打开状态

### Requirement: Panel toolbar
系统 SHALL 在思维导图面板顶部提供工具栏。工具栏 SHALL 包含以下元素：
- **图谱选择器**: 下拉菜单，列出所有已创建的图谱。选择后切换当前活跃图谱。
- **更新图谱按钮**: 触发手动同步生成
- **自动同步开关**: 切换当前活跃图谱关联 Conversation 的 autoSync 状态
- **导出按钮**: 导出图谱为 Markdown 文件
- **关闭按钮**: 关闭面板（等同于全局 toggle）

#### Scenario: Switch mindmap via selector
- **WHEN** 用户在图谱选择器中切换到另一个图谱
- **THEN** 面板渲染所选集谱的树结构

#### Scenario: Export mindmap as Markdown
- **WHEN** 用户点击导出按钮
- **THEN** 系统将图谱树结构还原为 Markdown 格式并触发下载

### Requirement: New conversation dialog with mindmap association
系统 SHALL 在用户创建新对话时弹出对话框，询问思维导图关联方式。对话框 SHALL 包含三个选项：
- 不关联（纯聊天）
- 关联到已有图谱（下拉选择）
- 创建新图谱（输入框 + 创建）

对话框 SHALL 同时提供"开启自动同步"复选框（仅在选择关联时可用）。

#### Scenario: Skip mindmap association
- **WHEN** 用户选择"不关联"并点击"开始对话"
- **THEN** 系统创建新 Conversation，mindmapId 为 undefined，autoSync 为 false

#### Scenario: Link to existing mindmap
- **WHEN** 用户选择"关联到已有图谱"并从下拉列表中选择"React 学习"，点击"开始对话"
- **THEN** 系统创建新 Conversation，mindmapId 设置为选中图谱的 ID

#### Scenario: Create new mindmap with conversation
- **WHEN** 用户选择"创建新图谱"，输入名称"Go 学习笔记"，勾选"开启自动同步"，点击"开始对话"
- **THEN** 系统创建新图谱，然后创建新 Conversation 并关联到新图谱，autoSync 为 true

#### Scenario: Auto-sync checkbox disabled when no association
- **WHEN** 用户选择"不关联"
- **THEN** "开启自动同步"复选框显示为禁用状态

### Requirement: Responsive behavior
系统 SHALL 在小屏幕（<768px）下隐藏思维导图面板，全局开关按钮也隐藏。用户在小屏幕上不可见图谱面板。

#### Scenario: Mobile hides panel
- **WHEN** 用户在移动设备（<768px 宽度）上使用应用
- **THEN** 图谱面板强制隐藏，全局开关按钮不显示
