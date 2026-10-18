## MODIFIED Requirements

### Requirement: Add provider

系统 SHALL 允许用户添加自定义模型提供商。用户 MUST 提供提供商名称和 API 端点 URL；API 密钥 SHALL 对远端端点必填，对本地端点（`localhost`、`127.0.0.1`、`::1`、`0.0.0.0`）可留空。用户 SHALL 可手动输入模型列表，或通过 API 自动获取可用模型列表（如果端点支持）；本地端点在密钥为空时 SHALL 仍允许"获取模型列表"。

系统 SHALL 在构造客户端时规范化端点（去掉末尾 `/`）。对本地端点且密钥为空的情况，系统 SHALL 使用占位密钥以满足 OpenAI SDK 的非空要求，且 SHALL NOT 将其持久化为用户密钥。

#### Scenario: Add provider with valid configuration

- **WHEN** 用户填写提供商名称、API 端点和 API 密钥，并提交
- **THEN** 系统保存提供商配置，并显示在提供商列表中

#### Scenario: Add a local provider without an API key

- **WHEN** 用户添加端点为 `http://localhost:11434/v1` 的提供商且不填写 API 密钥
- **THEN** 校验通过并保存提供商配置
- **AND** "获取模型列表"按钮可用

#### Scenario: Add provider and auto-fetch models

- **WHEN** 用户添加提供商后选择"获取模型列表"
- **THEN** 系统调用该提供商的 `/models` 端点获取可用模型列表，并填充到模型列表中

#### Scenario: Add provider with manual model entry

- **WHEN** 用户手动输入模型列表并提交
- **THEN** 系统保存提供商配置，并在模型选择器中显示这些模型
