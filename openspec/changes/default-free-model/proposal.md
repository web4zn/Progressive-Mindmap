## Why

当前新用户打开应用后需要在设置中手动配置 API 提供商和密钥才能使用。没有「开箱即用」的体验，许多潜在用户在配置步骤就流失了。提供预配置的 OpenRouter 免费模型列表，用户只需粘贴 API key 即可使用多种免费模型（Google/Meta/Mistral/DeepSeek），无需单独对接每个厂商。

## What Changes

- **预置 OpenRouter 提供商**：系统初始化时自动创建 OpenRouter 配置，包含多个免费模型（Gemma 3、Llama 3.3、Mistral Nemo、DeepSeek R1 等）。endpoint 统一为 `https://openrouter.ai/api/v1`。
- **免费模型标识**：Provider 数据模型新增 `preset: boolean` 字段，标记系统预置的提供商。预置提供商不可删除，但用户可禁用其模型。
- **初始化逻辑**：ProviderStore 在首次启动时（store 为空）自动注册预置 OpenRouter 提供商。已有用户的 store 不受影响。
- **配置页提示**：在 ProviderSettingsPage 中预置提供商下方显示说明文字和「获取免费 API Key」链接（指向 openrouter.ai）。
- **降级策略**：免费模型不可用时（如限流），错误提示中建议切换其他免费模型或配置自有 API key。

## Capabilities

### New Capabilities
- `preset-model-provider`: 系统预置免费模型提供商，首次启动自动注册，开箱即用

### Modified Capabilities
- `model-provider`: Provider 数据模型新增 `preset` 字段；新增预置提供商保护（不可删除）

## Impact

- **数据模型**：`src/types/provider.ts` Provider 新增 `preset?: boolean`
- **状态管理**：`src/stores/providerStore.ts` 新增初始化逻辑，注入 OpenRouter 配置及免费模型列表
- **UI 组件**：`src/features/provider/ProviderSettingsPage.tsx` 预置提供商 UI 区分 + 注册引导链接
- **配置持久化**：预置提供商存储方式与用户自建一致（IndexedDB）
- **迁移**：首次启动检测（store 为空 → 注入预置），已有用户不受影响
