## ADDED Requirements

### Requirement: Provider data model
系统 SHALL 使用以下数据模型表示模型提供商：

```
Provider {
  id: string          // UUID
  name: string        // 显示名称，如 "OpenAI", "DeepSeek"
  apiEndpoint: string // API 基础 URL，如 "https://api.openai.com/v1"
  apiKey: string      // API 密钥
  models: Model[]     // 该提供商下的可用模型列表
  supportsJsonMode: boolean // 是否支持 JSON mode（detectJsonMode 自动检测）
  createdAt: number   // 创建时间戳
  updatedAt: number   // 更新时间戳
}

Model {
  id: string          // 模型标识，如 "gpt-4o", "deepseek-chat"
  name: string        // 显示名称
  enabled: boolean    // 是否启用
}
```

#### Scenario: Provider data structure
- **WHEN** 用户创建一个新的提供商配置
- **THEN** 系统生成唯一 ID，记录创建和更新时间，存储所有必填字段

### Requirement: Add provider
系统 SHALL 允许用户添加自定义模型提供商。用户 MUST 提供提供商名称、API 端点 URL 和 API 密钥。用户 SHALL 可选择手动输入模型列表，或通过 API 自动获取可用模型列表（如果端点支持）。

#### Scenario: Add provider with valid configuration
- **WHEN** 用户填写提供商名称、API 端点和 API 密钥，并提交
- **THEN** 系统保存提供商配置，并显示在提供商列表中

#### Scenario: Add provider and auto-fetch models
- **WHEN** 用户添加提供商后选择"获取模型列表"
- **THEN** 系统调用该提供商的 /models 端点获取可用模型列表，并填充到模型列表中

#### Scenario: Add provider with manual model entry
- **WHEN** 提供商端点不支持 /models API
- **THEN** 用户可手动输入模型 ID 添加到模型列表

### Requirement: Edit provider
系统 SHALL 允许用户编辑已有的提供商配置。可修改的字段 SHALL 包括名称、API 端点、API 密钥和模型列表。

#### Scenario: Edit provider name
- **WHEN** 用户修改提供商的显示名称并保存
- **THEN** 系统更新提供商名称，所有引用该提供商的地方显示新名称

#### Scenario: Edit API key
- **WHEN** 用户更新提供商的 API 密钥并保存
- **THEN** 系统使用新密钥替换旧密钥，后续请求使用新密钥

#### Scenario: Edit model list
- **WHEN** 用户添加或删除提供商下的模型
- **THEN** 系统更新模型列表，模型选择下拉框同步更新

### Requirement: Delete provider
系统 SHALL 允许用户删除已有的提供商配置。删除前 SHALL 显示确认对话框。删除提供商后，使用该提供商的会话 SHALL 显示"当前模型不可用"状态，但不删除会话数据。

#### Scenario: Delete provider with confirmation
- **WHEN** 用户点击删除提供商并确认
- **THEN** 系统删除该提供商配置，所有关联模型从选择列表中移除

#### Scenario: Delete provider affects conversations
- **WHEN** 用户删除一个提供商，且存在使用该提供商的会话
- **THEN** 这些会话在 ChatPage 中显示"当前模型不可用"，会话历史保留但不可发送新消息

### Requirement: Provider preset templates
系统 SHALL 提供常见提供商的预设模板（OpenAI、Anthropic/via compatible endpoint、DeepSeek、Ollama），一键填充 API 端点和默认模型列表。用户 SHALL 仍可修改预设的字段值。

#### Scenario: Use OpenAI preset
- **WHEN** 用户选择 OpenAI 预设模板
- **THEN** 系统自动填充 API 端点为 "https://api.openai.com/v1"，预设模型列表包含 "gpt-4o", "gpt-4o-mini" 等

#### Scenario: Use Ollama preset
- **WHEN** 用户选择 Ollama 预设模板
- **THEN** 系统自动填充 API 端点为 "http://localhost:11434/v1"，API 密钥字段提示"可留空"

#### Scenario: Modify preset values
- **WHEN** 用户选择预设后修改 API 端点或模型列表
- **THEN** 系统接受修改后的值，不覆盖用户输入

### Requirement: API key security
系统 SHALL 对存储的 API 密钥采取基本保护措施。API 密钥在界面显示时 SHALL 默认遮蔽。API 密钥 SHALL 通过 Zustand persist 中间件 + `createIndexedDBStorage()` 存储到 IndexedDB `zustand-persist` store，不通过网络发送到任何第三方服务器。

#### Scenario: API key display masking
- **WHEN** 用户查看提供商配置
- **THEN** API 密钥字段默认显示为遮蔽状态（如 "sk-************"）

#### Scenario: API key stored in IndexedDB
- **WHEN** 用户保存提供商配置
- **THEN** API 密钥写入 IndexedDB `zustand-persist` store

#### Scenario: API key not sent to third party
- **WHEN** 用户发送对话消息
- **THEN** API 密钥仅在请求用户配置的 API 端点时作为 Authorization 头发送

### Requirement: Model selection
系统 SHALL 在聊天界面提供模型选择器，显示所有已启用提供商下的已启用模型。模型选择器 SHALL 按"提供商名称 / 模型名称"格式显示，支持快速切换当前使用的模型。

#### Scenario: Select model from dropdown
- **WHEN** 用户在模型选择器中选择一个模型
- **THEN** 后续对话消息使用该模型对应的提供商和模型 ID 发送请求

#### Scenario: No available models
- **WHEN** 用户未配置任何提供商或所有模型均被禁用
- **THEN** 模型选择器显示提示"请先配置模型提供商"，发送按钮禁用
