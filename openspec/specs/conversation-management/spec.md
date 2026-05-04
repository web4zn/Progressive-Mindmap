## ADDED Requirements

### Requirement: Create conversation
系统 SHALL 允许用户创建新的对话会话。创建新会话时 SHALL 弹出对话框，询问用户是否创建新图谱。每个会话 SHALL 关联一个模型提供商和具体模型。创建会话时 SHALL 自动设置默认的提供商和模型（用户最近使用的配置）。

#### Scenario: Create new conversation without mindmap
- **WHEN** 用户点击"新建对话"按钮，在对话框中选择"不关联"并提交
- **THEN** 系统创建新的空白会话，自动选择上次使用的提供商和模型

#### Scenario: Create new conversation with new mindmap
- **WHEN** 用户在对话框中选择"创建新图谱"，输入图谱名称并提交
- **THEN** 系统先创建新图谱，再创建新会话

### Requirement: Switch conversation
系统 SHALL 提供会话列表侧边栏，用户可点击切换到不同的会话。侧边栏 SHALL 使用深色背景，会话项使用 Lucide 图标操作按钮。切换会话时 SHALL 保存当前会话状态，加载目标会话的消息历史。

#### Scenario: Switch between conversations
- **WHEN** 用户在侧边栏点击另一个会话
- **THEN** 当前会话状态保存，目标会话的消息历史加载到对话区域，模型选择器切换到该会话关联的模型，被选中的会话项高亮显示

#### Scenario: Switch during generation
- **WHEN** 用户在 AI 响应生成期间切换到另一个会话
- **THEN** 当前会话的生成继续在后台进行，用户切换回时显示完整响应

### Requirement: Delete conversation
系统 SHALL 允许用户删除会话。删除前 SHALL 显示确认对话框。删除后 SHALL 不可恢复。

#### Scenario: Delete conversation with confirmation
- **WHEN** 用户点击删除会话并确认
- **THEN** 系统删除该会话及其所有消息，从侧边栏移除

#### Scenario: Delete current conversation
- **WHEN** 用户删除当前正在查看的会话
- **THEN** 系统自动切换到列表中的下一个会话，若无其他会话则创建新的空白会话

### Requirement: Conversation title auto-generation
系统 SHALL 根据用户第一条消息的内容自动生成会话标题。标题 SHALL 截取消息前 20 个字符，超出部分用省略号替代。用户 SHALL 可手动编辑会话标题。

#### Scenario: Auto-generate title from first message
- **WHEN** 用户在新会话中发送第一条消息
- **THEN** 会话标题自动设置为消息内容的前 20 个字符

#### Scenario: Manual title edit
- **WHEN** 用户双击会话标题进行编辑并保存
- **THEN** 会话标题更新为用户输入的文本

### Requirement: System prompt configuration
系统 SHALL 允许用户为每个会话配置系统提示词（system prompt）。系统提示词 SHALL 在每条消息请求中作为 system 角色消息发送。用户 SHALL 可在会话设置中编辑系统提示词。

#### Scenario: Set system prompt
- **WHEN** 用户在会话设置中输入系统提示词并保存
- **THEN** 后续消息请求中包含该系统提示词作为 system 角色消息

#### Scenario: Empty system prompt
- **WHEN** 用户未设置系统提示词或清空了系统提示词
- **THEN** 消息请求中不包含 system 角色消息

### Requirement: Conversation persistence
系统 SHALL 将会话数据持久化到 IndexedDB，通过 Zustand persist + `createIndexedDBStorage()` 实现。数据 SHALL 在页面刷新后完整恢复。

#### Scenario: Persistence across page reload
- **WHEN** 用户刷新页面
- **THEN** 所有会话和历史消息从 IndexedDB 完整恢复

### Requirement: Conversation search
系统 SHALL 提供会话搜索功能，用户可根据关键词搜索会话标题和消息内容。

#### Scenario: Search by keyword
- **WHEN** 用户在搜索框输入关键词
- **THEN** 会话列表过滤为包含该关键词的会话（匹配标题或消息内容），高亮匹配文本

#### Scenario: Clear search
- **WHEN** 用户清空搜索框
- **THEN** 会话列表恢复显示所有会话

### Requirement: Export conversation
系统 SHALL 允许用户导出单个会话为 Markdown 文件。

#### Scenario: Export conversation as Markdown
- **WHEN** 用户选择导出会话
- **THEN** 系统生成 Markdown 格式的文件并触发下载，文件包含完整的对话内容（用户消息和 AI 回复）

### Requirement: Sidebar dark theme
侧边栏 SHALL 使用深色背景，与浅色内容区形成视觉对比。侧边栏背景 SHALL 覆盖整个侧边栏高度，包括搜索区、列表区和底部按钮区。

#### Scenario: Sidebar appearance in light mode
- **WHEN** 系统为浅色主题
- **THEN** 侧边栏使用深灰色背景，文字使用浅色

#### Scenario: Sidebar appearance in dark mode
- **WHEN** 系统为深色主题
- **THEN** 侧边栏使用黑色背景

### Requirement: Icon-driven action buttons
侧边栏中的会话操作按钮（新建、重命名、删除、导出）SHALL 使用 Lucide 图标组件而非文字。操作按钮仅在 hover 会话项时显示，默认隐藏。

#### Scenario: New conversation button
- **WHEN** 用户点击侧边栏顶部的新建按钮
- **THEN** 按钮使用 Plus 图标 + "新建对话" 文字标签

#### Scenario: Hover actions on conversation item
- **WHEN** 用户悬停在一个会话项上
- **THEN** 显示 Download / Pencil / Trash2 三个 Lucide 图标按钮

### Requirement: Improved selection state
当前激活的会话 SHALL 使用高亮背景色。hover 状态的会话 SHALL 使用半透明高亮背景。

#### Scenario: Active conversation highlight
- **WHEN** 用户切换到一个会话
- **THEN** 该会话项显示突出背景色，与其他未选中项形成明显对比

