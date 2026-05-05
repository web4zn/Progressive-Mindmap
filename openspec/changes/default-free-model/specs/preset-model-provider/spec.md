## ADDED Requirements

### Requirement: Preset provider initialization
系统 SHALL 在首次启动（ProviderStore 中无提供商）时自动注册一个预置提供商：OpenRouter（endpoint `https://openrouter.ai/api/v1`），包含至少 5 个免费模型。预置提供商 SHALL 使用 `preset: true` 标记，不可被用户删除，但其模型可被禁用。已存在提供商的用户 SHALL 不受此初始化影响。

#### Scenario: First launch auto-creates OpenRouter preset
- **WHEN** 用户首次打开应用，ProviderStore 中无任何提供商
- **THEN** 系统自动创建 `preset: true` 的 OpenRouter 提供商，包含 Gemma 3 12B、Llama 3.3 70B、Mistral Nemo、DeepSeek R1、Qwen 2.5 7B 等免费模型
- **AND** 提供商设置页面显示该预置提供商

#### Scenario: Existing user is unaffected
- **WHEN** 用户已有至少一个提供商配置
- **THEN** 系统不注入任何预置提供商，用户数据完全不变

### Requirement: Free model switching guidance
当某个免费模型调用失败时，错误提示中 SHALL 包含引导文字「免费模型有限制，可切换其他免费模型或添加自己的 API key 获得更稳定体验」。

#### Scenario: Free model rate limit exceeded
- **WHEN** 选中免费模型返回 429 或调用失败
- **THEN** 错误提示中包含切换模型和添加自有 key 的引导文字
