## MODIFIED Requirements

### Requirement: Create conversation
系统 SHALL 允许用户创建新的对话会话。创建新会话时 SHALL 弹出对话框，询问用户是否创建新图谱。每个会话 SHALL 关联一个模型提供商和具体模型。创建会话时 SHALL 自动设置默认的提供商和模型（用户最近使用的配置）。

#### Scenario: Create new conversation without mindmap
- **WHEN** 用户点击"新建对话"按钮，在对话框中选择"不关联"并提交
- **THEN** 系统创建新的空白会话，自动选择上次使用的提供商和模型

#### Scenario: Create new conversation with new mindmap
- **WHEN** 用户在对话框中选择"创建新图谱"，输入图谱名称并提交
- **THEN** 系统先创建新图谱，再创建新会话

## REMOVED Requirements

### Requirement: Conversation mindmap fields
**Reason**: `Conversation.mindmapId` 和 `Conversation.autoSync` 字段删除。图谱的对话关联由 `MindMap.corpus` 表达，监听由 `MindMap.monitoredConversationIds` 表达。
**Migration**: 这两个字段从 `Conversation` 类型中直接移除，相关 UI 移除。

### Requirement: Change conversation mindmap association
**Reason**: 替换为语料库和监听机制。对话与图谱的关联通过添加/移除语料库条目管理，监听通过图谱设置管理。
