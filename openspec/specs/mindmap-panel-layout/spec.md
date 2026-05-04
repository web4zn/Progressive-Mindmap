## ADDED Requirements

### Requirement: Right panel layout
系统 SHALL 在主内容区右侧提供思维导图面板。面板 SHALL 位于侧边栏和聊天区之后，形成三栏布局。面板 SHALL 仅在全局开关开启时显示。

#### Scenario: Panel visible
- **WHEN** 用户开启全局图谱面板开关
- **THEN** 右侧显示图谱面板（默认宽度 350px），聊天区收缩以适应面板

#### Scenario: Panel hidden
- **WHEN** 用户关闭全局图谱面板开关
- **THEN** 右侧图谱面板隐藏，聊天区恢复完整宽度

### Requirement: Resizable panel
系统 SHALL 允许用户通过拖动面板左侧分隔线调整面板宽度。宽度范围 SHALL 为 200px-600px。

### Requirement: Global toggle button
系统 SHALL 在聊天区顶栏提供全局图谱面板的开关按钮。

### Requirement: Panel toolbar
系统 SHALL 在思维导图面板顶部提供工具栏：
- **图谱选择器**: 下拉菜单，列出所有已创建的图谱
- **更新图谱按钮**: 触发手动同步生成（物料优先）
- **自动同步开关**: 切换关联 Conversation 的 autoSync 状态
- **导出按钮**: 导出图谱为 Markdown 文件
- **图谱设置按钮**: 打开图谱生成设置对话框
- **关闭按钮**: 关闭面板

### Requirement: New conversation dialog with mindmap association
系统 SHALL 在用户创建新对话时弹出对话框，询问思维导图关联方式：不关联、关联到已有图谱（单选下拉）、创建新图谱。同时提供"开启自动同步"复选框。

### Requirement: Responsive behavior
系统 SHALL 在小屏幕（<768px）下隐藏思维导图面板。

### Requirement: Material pool area
系统 SHALL 在脑图面板工具栏下方提供「生成物料」可折叠区域。显示物料列表（来源对话 → 消息摘要），支持单个删除和全部清空操作。

#### Scenario: Material pool visible
- **WHEN** 脑图面板打开且物料池非空
- **THEN** 显示物料列表，标题显示物料数量

### Requirement: Reasoning content display
系统 SHALL 在脑图生成过程中，如果 LLM 返回 reasoning 内容，展示为可折叠的「AI 思考过程」区域。

### Requirement: Generation progress indicator
系统 SHALL 在脑图生成过程中显示进度信息：已生成节点数和当前最大深度。生成完成后自动消失。

### Requirement: Quality validation warnings
系统 SHALL 在生成完成后，如有校验警告，在面板底部以黄色警告形式显示。
