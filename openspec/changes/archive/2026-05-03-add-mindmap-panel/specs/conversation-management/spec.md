## MODIFIED Requirements

### Requirement: Create conversation
系统 SHALL 允许用户创建新的对话会话。创建新会话时 SHALL 弹出对话框，询问用户是否关联思维导图。对话框 SHALL 提供三个选项：不关联（纯聊天）、关联到已有图谱（下拉选择）、创建新图谱（输入名称后自动创建并关联）。每个会话 SHALL 关联一个模型提供商和具体模型。创建会话时 SHALL 自动设置默认的提供商和模型（用户最近使用的配置）。

#### Scenario: Create new conversation without mindmap
- **WHEN** 用户点击"新建对话"按钮，在对话框中选择"不关联"并提交
- **THEN** 系统创建新的空白会话，mindmapId 为 undefined，自动选择上次使用的提供商和模型，切换到该会话视图

#### Scenario: Create new conversation linked to existing mindmap
- **WHEN** 用户在对话框中选择"关联到已有图谱"，从下拉列表选择某个图谱并提交
- **THEN** 系统创建新会话，mindmapId 设置为选中图谱的 ID

#### Scenario: Create new conversation with new mindmap
- **WHEN** 用户在对话框中选择"创建新图谱"，输入图谱名称并提交
- **THEN** 系统先创建新图谱，再创建新会话并关联到该图谱

#### Scenario: First conversation creation
- **WHEN** 用户首次使用应用，没有任何历史会话和任何图谱
- **THEN** 对话框的图谱下拉列表显示为空，"创建新图谱"选项正常可用

## ADDED Requirements

### Requirement: Conversation mindmap fields
Conversation 数据模型 SHALL 新增以下可选字段：
- `mindmapId?: string` — 关联的思维导图 ID，undefined 表示无关联
- `autoSync?: boolean` — 是否开启自动同步，仅当 mindmapId 存在时有效，默认 false

#### Scenario: Default mindmap fields on creation
- **WHEN** 用户在新建对话对话框中选择"不关联"
- **THEN** Conversation 的 mindmapId 为 undefined，autoSync 为 false

#### Scenario: Auto-sync enabled on creation
- **WHEN** 用户在新建对话对话框中关联图谱并勾选"开启自动同步"
- **THEN** Conversation 的 mindmapId 指向所选图谱，autoSync 为 true

### Requirement: Change conversation mindmap association
系统 SHALL 允许用户随时在会话设置中修改 Conversation 的图谱关联和自动同步设置。

#### Scenario: Associate previously unlinked conversation
- **WHEN** 用户在会话设置中选择一个图谱关联到当前 Conversation
- **THEN** Conversation 的 mindmapId 更新，右侧面板可显示该图谱

#### Scenario: Toggle auto-sync
- **WHEN** 用户在会话设置中开启/关闭 autoSync
- **THEN** Conversation 的 autoSync 字段更新，影响后续对话的自动同步行为
