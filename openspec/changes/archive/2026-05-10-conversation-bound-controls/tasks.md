## 1. Conversation Type — agentMode 字段

- [x] 1.1 Add `agentMode?: 'enhance' | 'mediate'` field to `Conversation` interface in `src/types/conversation.ts`
- [x] 1.2 Verify no TypeScript errors from the new optional field

## 2. ConversationStore — per-conversation agentMode

- [x] 2.1 In `addConversation()`, set default `agentMode: 'enhance'` for new conversations
- [x] 2.2 Export `setConversationAgentMode` action: `updateConversation(id, { agentMode })` (reuses existing `updateConversation` — just a store slice export if needed)
- [x] 2.3 Verify persisted store handles the new field correctly (no migration needed since it's optional)

## 3. ChatStore — 移除全局 agentMode

- [x] 3.1 Remove `agentMode`, `setAgentMode` from `ChatState` interface
- [x] 3.2 Remove related implementations in `create<ChatState>()`
- [x] 3.3 Keep `agentStatus` and `agentMessage` (these remain global — they're UI state, not conversation config)

## 4. Worker 消息类型扩展

- [x] 4.1 Add `providerConfig` and `model` fields to `ENHANCE_MESSAGE` payload in `src/lib/agent/types.ts`:

```typescript
// ENHANCE_MESSAGE payload 增加
providerConfig: { apiEndpoint: string; apiKey: string }
model: string
```

## 5. useMindmapAgent — enhanceMessage 传入 providerConfig

- [x] 5.1 In `enhanceMessage()`, read active conversation's provider + model from store
- [x] 5.2 Pass `providerConfig` and `model` in the `ENHANCE_MESSAGE` payload

## 6. agent.worker — ENHANCE_MESSAGE 重建 languageModel

- [x] 6.1 In `case 'ENHANCE_MESSAGE'`, before processing, recreate `languageModel` from `msg.payload.providerConfig` + `msg.payload.model` (same pattern as `MEDIATE_MESSAGE` lines 270-275)

## 7. ChatInputPanel — 新的集成输入面板组件

- [x] 7.1 Create `src/features/chat/ChatInputPanel.tsx` — new component that composes:
  - Control row: `ModelSelector` (left) + agent mode toggle (right) — horizontal flex
  - Input row: `textarea` + send/stop button (adapted from current `MessageInput`)
  - Bottom row: `AgentActivityPanel` (only in enhance mode & non-idle)
- [x] 7.2 Adopt shadcn InputGroup styling: border container, rounded corners, subtle shadow
- [x] 7.3 Agent mode toggle: two `<button>` elements ("✨ 增强" / "🤖 Agent") with `stopGeneration()` on switch — same logic as current, just relocated
- [x] 7.4 Input textarea: auto-resize (`field-sizing-content` or JS), Enter to send, Shift+Enter newline
- [x] 7.5 Send/stop button: right-aligned in input row
- [x] 7.6 The component reads `activeConversation.agentMode` instead of `chatStore.agentMode` for toggle state
- [x] 7.7 Toggle calls `updateConversation(id, { agentMode: newMode })` instead of `setAgentMode()`

## 8. ChatPage — 导航栏精简 + 输入面板替换

- [x] 8.1 Remove `<ModelSelector />` from navbar (line 280 in current `ChatPage.tsx`)
- [x] 8.2 Remove agent mode toggle `<button>` elements from navbar (lines 282-294)
- [x] 8.3 Remove `agentMode` and `setAgentMode` imports from chatStore
- [x] 8.4 Replace `<MessageInput>` usage with new `<ChatInputPanel>`
- [x] 8.5 Pass necessary props: `onSend`, `onStop`, `isGenerating`, `disabled`
- [x] 8.6 Move `AgentActivityPanel` rendering inside `ChatInputPanel` (remove from ChatPage)

## 9. ModelSelector — 适配嵌入使用

- [x] 9.1 No functional changes needed (already reads from conversationStore)
- [x] 9.2 Consider visual polish: compact variant for narrower space in control row (optional)

## 10. 清理旧代码

- [x] 10.1 Remove `src/features/chat/MessageInput.tsx` (replaced by `ChatInputPanel`)
- [x] 10.2 Remove `AgentActivityPanel` inline usage from `ChatPage.tsx`
- [x] 10.3 Clean up unused imports in `ChatPage.tsx`

## 11. 验证

- [x] 11.1 `npx tsc --noEmit` — no type errors
- [x] 11.2 `npm test` — all tests pass (73 passed)
- [x] 11.3 `npm run build` — production build succeeds
- [ ] 11.4 Manual test: Create conversation A, switch to Agent mode → switch to conversation B, verify it's in enhance mode → switch back to A, verify it's still Agent mode
- [ ] 11.5 Manual test: Switch model while in enhance mode, send message, verify Agent enhancement uses the new model
