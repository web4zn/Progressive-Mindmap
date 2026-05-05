## Tasks

### 1. 数据模型扩展
- [x] `src/types/provider.ts`：Provider 新增 `preset?: boolean` 字段

### 2. ProviderStore 初始化逻辑
- [x] `src/stores/providerStore.ts`：persist 恢复后检测 `providers.length === 0`，注入预置 OpenRouter 提供商
- [x] 预置配置：endpoint `https://openrouter.ai/api/v1`，models 列表 5 个免费模型（Gemma 3 12B、Llama 3.3 70B、Mistral Nemo、DeepSeek R1、Qwen 2.5 7B）

### 3. 预置提供商保护
- [x] `src/stores/providerStore.ts`：`removeProvider` 拒绝删除 `preset: true` 的提供商
- [x] `src/features/provider/ProviderSettingsPage.tsx`：预置提供商显示标识标记

### 4. 降级引导
- [x] `src/features/chat/ChatPage.tsx`：免费模型错误提示中引导切换其他模型或添加自有 key
- [x] `src/features/mindmap/MindMapPanel.tsx`：生成脑图失败时提示同上

### 5. 测试
- [x] `providerStore.test.ts`：验证首次启动注入预置提供商、已有用户不受影响
- [x] `providerStore.test.ts`：验证预置提供商不可删除
- [x] 手动测试：清除 IndexedDB 后刷新，验证预置提供商自动出现
