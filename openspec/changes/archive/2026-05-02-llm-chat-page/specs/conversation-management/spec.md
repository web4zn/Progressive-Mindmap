## ADDED Requirements

### Requirement: Create conversation
系统 SHALL 允许用户创建新的对话会话。每个会话 SHALL 关联一个模型提供商和具体模型。创建会话时 SHALL 自动设置默认的提供商和模型（用户最近使用的配置）。

#### Scenario: Create new conversation
- **WHEN** 用户点击"新建对话"按钮
- **THEN** 系统创建新的空白会话，自动选择上次使用的提供商和模型，切换到该会话视图

#### Scenario: First conversation creation
- **WHEN** 用户首次使用应用，没有任何历史会话
- **THEN** 系统自动创建一个默认对话，提示用户选择模型提供商

### Requirement: Switch conversation
系统 SHALL 提供会话列表侧边栏，用户可点击切换到不同的会话。切换会话时 SHALL 保存当前会话状态，加载目标会话的消息历史。

#### Scenario: Switch between conversations
- **WHEN** 用户在侧边栏点击另一个会话
- **THEN** 当前会话状态保存，目标会话的消息历史加载到对话区域，模型选择器切换到该会话关联的模型

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
系统 SHALL 将会话数据（包括消息历史、关联的提供商/模型、系统提示词）持久化到浏览器 IndexedDB。数据 SHALL 在页面刷新后完整恢复。

#### Scenario: Persistence across page reload
- **WHEN** 用户刷新页面或关闭后重新打开应用
- **THEN** 所有会话列表和历史消息完整恢复，包括当前正在进行的对话

#### Scenario: Large conversation history
- **WHEN** 会话包含大量消息（100+）
- **THEN** 系统仍能正常加载和渲染，通过虚拟滚动或分页加载保证性能

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
