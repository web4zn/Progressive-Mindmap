## 1. System Prompt Extraction

- [x] 1.1 Create `src/lib/agent/system-prompt.ts` — export `buildMindmapAgentPrompt()` function
- [x] 1.2 Copy the inline prompt from `useMindmapAgent.ts` (lines 176-198) into the new function
- [x] 1.3 Update `useMindmapAgent.ts` to import from system-prompt.ts instead of inline string
- [x] 1.4 Verify agent behavior is identical after extraction

## 2. Zod Schema Validation

- [x] 2.1 Create `src/lib/agent/schema.ts` — define `MindmapOperationSchema` and `OperationsArraySchema`
- [x] 2.2 Add `safeParse` call in `agent-tools.ts` `generateMindmapOps` handler before `applyOperations()`
- [x] 2.3 Return descriptive error on validation failure (with field path and message)
- [x] 2.4 Write unit tests for valid operations passing and invalid operations being rejected
- [x] 2.5 Write unit test for operations exceeding max count (10)

## 3. BaseAgent Class

- [x] 3.1 Create `src/lib/agent/base-agent.ts` — abstract BaseAgent with `callLLM()` and `callTool()`
- [x] 3.2 Define `AgentContext` interface (model, providerConfig, systemPrompt, onToolCall, onStatusReport)
- [x] 3.3 Write unit tests for BaseAgent (callLLM mock, callTool dispatch)

## 4. ReActRunner Extraction

- [x] 4.1 Create `src/lib/agent/ReActRunner.ts` — class that encapsulates the ReAct loop
- [x] 4.2 Extract the loop logic from `agent.worker.ts` lines 92-175 into ReActRunner
- [x] 4.3 Keep the same behavior: 5 max steps, tool result injection, invalid call retry
- [x] 4.4 Update `agent.worker.ts` to instantiate ReActRunner and call `.run()` from message handlers
- [x] 4.5 Verify ENHANCE_MESSAGE mode works identically
- [x] 4.6 Verify MEDIATE_MESSAGE mode works identically (streaming still functional)

## 5. Worker File Cleanup

- [x] 5.1 Verify `agent.worker.ts` is reduced to message routing only (< ~150 lines)
- [x] 5.2 Confirm all postMessage protocols (AGENT_STATUS, AGENT_COMPLETE, STREAM_TOKEN, etc.) unchanged
- [x] 5.3 Confirm tool definitions (AI SDK `tool()` objects) remain in worker (they are worker-specific)

## 6. Regression Testing

- [x] 6.1 Run existing test suite — verify no regressions
- [x] 6.2 Test ENHANCE_MESSAGE: AI responds → agent auto-updates mindmap
- [x] 6.3 Test MEDIATE_MESSAGE: user sends agent message → mindmap updates + answer streams
- [x] 6.4 Test Zod validation path: inject bad operations → verify rejection
- [x] 6.5 Test editedByUser protection: manually edit node → verify AI respects it
