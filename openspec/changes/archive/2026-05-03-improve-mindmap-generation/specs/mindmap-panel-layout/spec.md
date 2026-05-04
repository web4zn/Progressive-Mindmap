## MODIFIED Requirements

### Requirement: Panel toolbar
系统 SHALL 在思维导图面板顶部提供工具栏。工具栏 SHALL 包含以下元素：
- **图谱选择器**: 下拉菜单，列出所有已创建的图谱。选择后切换当前活跃图谱。
- **更新图谱按钮**: 触发手动同步生成。如果物料池非空，使用物料池内容；否则使用全部关联对话。
- **自动同步开关**: 切换当前活跃图谱关联 Conversation 的 autoSync 状态
- **导出按钮**: 导出图谱为 Markdown 文件
- **图谱设置按钮**: 打开图谱生成设置对话框
- **关闭按钮**: 关闭面板（隐藏面板，等同于全局 toggle）

#### Scenario: Switch mindmap via selector
- **WHEN** 用户在图谱选择器中切换到另一个图谱
- **THEN** 面板渲染所选集谱的树结构

#### Scenario: Export mindmap as Markdown
- **WHEN** 用户点击导出按钮
- **THEN** 系统将图谱树结构还原为 Markdown 格式并触发下载

### Requirement: New conversation dialog with mindmap association
系统 SHALL 在用户创建新对话时弹出对话框，询问思维导图关联方式。对话框 SHALL 包含三个选项：
- 不关联（纯聊天）
- 关联到已有图谱（多选下拉）
- 创建新图谱（输入框 + 创建）

对话框 SHALL 同时提供"开启自动同步"复选框（仅在选择关联时可用）。

#### Scenario: Skip mindmap association
- **WHEN** 用户选择"不关联"并点击"开始对话"
- **THEN** 系统创建新 Conversation，`mindmapIds` 为空数组，autoSync 为 false

#### Scenario: Link to existing mindmap
- **WHEN** 用户选择"关联到已有图谱"并多选「React 学习」和「前端基础」，点击"开始对话"
- **THEN** 系统创建新 Conversation，`mindmapIds` 设置为选中图谱的 ID 数组

#### Scenario: Create new mindmap with conversation
- **WHEN** 用户选择"创建新图谱"，输入名称"Go 学习笔记"，勾选"开启自动同步"，点击"开始对话"
- **THEN** 系统创建新图谱，然后创建新 Conversation 并关联到新图谱，autoSync 为 true

#### Scenario: Auto-sync checkbox disabled when no association
- **WHEN** 用户选择"不关联"
- **THEN** "开启自动同步"复选框显示为禁用状态

## ADDED Requirements

### Requirement: Material pool area in panel
系统 SHALL 在脑图面板的工具栏下方提供「物料池」区域。该区域 SHALL 可折叠，默认展开。区域 SHALL 显示物料列表（每个物料显示来源对话标题和消息摘要），支持单个删除和全部清空操作。

#### Scenario: Material pool visible
- **WHEN** 脑图面板打开
- **THEN** 工具栏下方显示物料池区域，标题为「生成物料」，右侧显示物料数量和清空按钮

#### Scenario: Toggle material pool collapse
- **WHEN** 用户点击物料池标题旁的折叠箭头
- **THEN** 物料列表折叠/展开，折叠后仅显示标题和计数

#### Scenario: Remove single material item
- **WHEN** 用户点击物料项旁的删除按钮
- **THEN** 该物料项从物料池移除，对应消息的选中状态清除

### Requirement: Reasoning content display area
系统 SHALL 在脑图面板中为 reasoning 内容提供可折叠展示区域。区域标题为「AI 思考过程」，默认展开。折叠/展开状态 SHALL 独立于物料池的折叠状态。

#### Scenario: Reasoning area visible during generation
- **WHEN** LLM 流式返回 reasoning_content
- **THEN** 面板中显示「AI 思考过程」可折叠区域，内容为 reasoning 文本

#### Scenario: Reasoning area hidden when absent
- **WHEN** LLM 不返回 reasoning_content
- **THEN**「AI 思考过程」区域不渲染

### Requirement: Generation progress bar
系统 SHALL 在脑图面板顶部（物料池区域上方）显示生成进度信息。进度信息 SHALL 包含已生成节点数和当前最大深度。进度信息 SHALL 在生成完成后自动消失。

#### Scenario: Progress during generation
- **WHEN** 生成中，当前已产出 12 个节点，最大深度 2
- **THEN** 面板顶部显示进度条文字「已生成 12 个主题 · 深度 2/3」

#### Scenario: Progress on completion
- **WHEN** 生成完成
- **THEN** 进度信息淡出消失，树视图渲染完成状态
