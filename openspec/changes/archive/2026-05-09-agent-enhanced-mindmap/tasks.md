## 1. Setup & Dependencies

- [x] 1.1 Install new dependencies: `npm install ai@latest @ai-sdk/openai@latest zod@latest`
- [x] 1.2 Create directory structure: `src/lib/agent/`, `src/workers/`, `src/hooks/`

## 2. Worker Communication Protocol

- [x] 2.1 Create `src/lib/agent/types.ts` with all message types (`MainToWorkerMessage`, `WorkerToMainMessage`, `MainToWorkerResponse`, `MindmapOperation`)
- [x] 2.2 Verify types compile with `npx tsc --noEmit`

## 3. Agent Tools (Main Thread)

- [x] 3.1 Create `src/lib/agent/agent-tools.ts` with `agentToolHandlers` registry
- [x] 3.2 Implement `readMindmap` tool handler (reads mindmap tree, returns serialized context via `mindmapTreeToContext()`)
- [x] 3.3 Implement `generateMindmapOps` tool handler (calls `chat()` with `buildFullMindmapPrompt()`, parses result, applies `mergeEditedNodes()`, updates mindmap store)
- [x] 3.4 Add error handling and logging to all tool handlers

## 4. Agent Worker

- [x] 4.1 Create `src/workers/agent.worker.ts` with ReAct loop (generateText + manual tool parsing)
- [x] 4.2 Implement `INIT` handler (creates OpenAI provider with custom API key/baseURL)
- [x] 4.3 Implement `ENHANCE_MESSAGE` handler (triggers agent reasoning loop: readMindmap → generateMindmapOps)
- [x] 4.4 Implement round-trip tool call mechanism (`TOOL_RESULT_NEEDED` → wait for `TOOL_RESULT` → resume agent)
- [x] 4.5 Add status reporting via `AGENT_STATUS` messages at each step
- [x] 4.6 Add error handling for agent failures and timeouts

## 5. useConversation Hook

- [x] 5.1 Create `src/hooks/useConversation.ts` — extract chat logic from `ChatPage.doSend()`
- [x] 5.2 Implement `sendMessage()` using `streamChat()` instead of `chat()` (streaming response)
- [x] 5.3 Strip mindmap generation instructions from system prompt (chat-only prompt)
- [x] 5.4 Add `onStreamComplete` callback for triggering Agent enhancement
- [x] 5.5 Preserve existing abort, error handling, and message management behavior

## 6. useMindmapAgent Hook

- [x] 6.1 Create `src/hooks/useMindmapAgent.ts` — manage Worker lifecycle
- [x] 6.2 Implement `initialize()` — creates Worker, sends `INIT` message
- [x] 6.3 Implement `enhanceMessage()` — sends `ENHANCE_MESSAGE` to Worker
- [x] 6.4 Implement message handler (`onmessage`) — process `AGENT_STATUS`, `AGENT_COMPLETE`, `AGENT_ERROR`
- [x] 6.5 Implement cleanup — `worker.terminate()` on unmount
- [x] 6.6 Add `AgentStatus` state management (idle → thinking → reading_mindmap → generating_mindmap → complete)

## 7. Agent Activity UI

- [x] 7.1 Create `src/features/chat/AgentActivityPanel.tsx` with status icons and labels
- [x] 7.2 Implement status-to-display mapping (icon + label + color for each status)
- [x] 7.3 Add slide-in animation for panel appearance, hide when idle
- [x] 7.4 Integrate `AgentActivityPanel` into `ChatPage` below `MessageInput`

## 8. ChatPage Refactoring

- [x] 8.1 Refactor `ChatPage.tsx` to use `useConversation()` hook instead of inline `doSend()`
- [x] 8.2 Integrate `useMindmapAgent()` hook for Agent lifecycle
- [x] 8.3 Wire `onStreamComplete` to trigger `agent.enhanceMessage()`
- [x] 8.4 Initialize Agent when active conversation and provider are available
- [x] 8.5 Remove mindmap-related prompt assembly and JSON parsing logic from ChatPage
- [x] 8.6 Update chatStore with Agent status type

## 9. Verification

- [x] 9.1 Run TypeScript type check: `npx tsc --noEmit`
- [x] 9.2 Run ESLint: `npm run lint` (0 errors, 2 warnings fixed)
- [x] 9.3 Run tests: `npm test` (73 passed)
- [ ] 9.4 Manual test: send message in enhance mode, verify streaming response
- [ ] 9.5 Manual test: verify Agent background generates/updates mindmap after streaming completes
- [ ] 9.6 Manual test: verify `editedByUser` nodes are preserved after Agent mindmap update
- [ ] 9.7 Manual test: verify graceful degradation when Worker is unavailable
