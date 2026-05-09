## 1. Communication Protocol

- [x] 1.1 Add `MEDIATE_MESSAGE` to `MainToWorkerMessage` in `types.ts`
- [x] 1.2 Add `STREAM_TOKEN` to `WorkerToMainMessage` in `types.ts`
- [x] 1.3 Add `STREAM_DONE` to `WorkerToMainMessage` in `types.ts`
- [x] 1.4 Verify types compile

## 2. ChatStore Mode State

- [x] 2.1 Add `agentMode: 'enhance' | 'mediate'` to `chatStore.ts`

## 3. Agent Worker — MEDIATE_MESSAGE

- [x] 3.1 Add `MEDIATE_MESSAGE` handler in `agent.worker.ts`
- [x] 3.2 Build user prompt from conversation context
- [x] 3.3 Run ReAct loop with auto tool calling (readMindmap → generateMindmapOps)
- [x] 3.4 After tools complete, stream final response to main thread via single chunk
- [x] 3.5 Send `STREAM_TOKEN` events via postMessage
- [x] 3.6 Send `STREAM_DONE` when streaming completes

## 4. useMindmapAgent Hook

- [x] 4.1 Add `mediateMessage(content, conversationId)` function
- [x] 4.2 Handle `STREAM_TOKEN` — append tokens to assistant message in store
- [x] 4.3 Handle `STREAM_DONE` — mark message complete, reset status

## 5. Mode Toggle UI

- [x] 5.1 Add mode toggle button group to `ChatPage.tsx` header
- [x] 5.2 Enhance mode button: "✨ 增强" (default, primary)
- [x] 5.3 Agent mode button: "🤖 Agent"
- [x] 5.4 Toggle switches `chatStore.agentMode` and updates UI

## 6. ChatPage Routing

- [x] 6.1 In `ChatPage.tsx`, routes `handleSend` when agentMode is 'mediate' to `agent.mediateMessage()`
- [x] 6.2 Hide Agent activity panel in mediate mode
- [x] 6.3 Creates user + assistant message placeholders for mediate mode

## 7. Verification

- [x] 7.1 TypeScript check: `npx tsc --noEmit`
- [x] 7.3 Tests: `npm test` (73 passed)
- [ ] 7.4 Manual test: switch to mediate mode, send message, verify Agent responds
- [ ] 7.5 Manual test: verify mindmap is updated after Agent response
- [ ] 7.6 Manual test: switch mode mid-conversation
