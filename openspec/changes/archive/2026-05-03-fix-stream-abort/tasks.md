## 1. Fix LLM Client Abort Detection

- [x] 1.1 在 `llm-client.ts` 中添加 `isAbortError(err: unknown): boolean` 工具函数，检查 `AbortSignal.aborted` 或 `err.cause?.name === 'AbortError'`
- [x] 1.2 修改 `streamChatWithRetry` 使用 `isAbortError` 替代 `err.name === 'AbortError'`

## 2. Fix ChatPage Abort Behavior

- [x] 2.1 修改 `doSend` catch 块：abort 时调用 `updateMessageInConversation(convId, msgId, { status: 'complete' })` 保留部分内容，而非 `removeLastAssistantMessage`
- [x] 2.2 确保 abort 后 `isGenerating` 状态正确重置为 false

## 3. Verify

- [x] 3.1 验证点击"停止生成"后部分内容保留显示
- [x] 3.2 验证现有测试通过
- [x] 3.3 验证 build 成功
