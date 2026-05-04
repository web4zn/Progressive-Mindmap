## Why

当前 "停止生成" 功能有两个 bug：
1. **中断后删除了部分回复**：适配规范要求"保留已生成的部分内容"，但当前实现调用了 `removeLastAssistantMessage` 将部分内容删除
2. **错误识别不正确**：检查 `err.name === 'AbortError'` 无法匹配 OpenAI SDK 包装后的错误类型（实际为 `APIConnectionError`），导致 abort 路径从未正确执行

## What Changes

- 修复 `doSend` 中的 abort 错误检测：改为检查 OpenAI 的 `APIError` 类型或通过 `AbortSignal` 状态判断
- 修复 abort 后行为：将 assistant 消息状态设为 `complete` 而非删除，保留已生成的部分内容
- 确保 `stopGeneration()` 中的 `isGenerating: false` 状态更新可靠

## Capabilities

### New Capabilities

### Modified Capabilities
- `chat-interface`: 修改"停止生成"需求 — 中断后保留部分内容而非删除

## Impact

- `src/features/chat/ChatPage.tsx` — 修改 `doSend` catch 块中的错误处理逻辑
- `src/lib/llm-client.ts` — 可能需要添加 abort 检测工具函数
- 无新增依赖、无 API 变更、无存储层变更
