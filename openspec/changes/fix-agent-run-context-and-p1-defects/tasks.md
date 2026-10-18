# Tasks — fix agent run context (P0) and P1 defects

Legend: `[ ]` pending · `[x]` done.

## 1. Change scaffolding

- [x] `proposal.md` + `tasks.md` + spec deltas (agent-orchestration,
      mindmap-incremental, mindmap-ui-stage-d).
- [x] `openspec validate fix-agent-run-context-and-p1-defects --strict` passes.

## 2. P0 — run-scoped tool context

- [x] `agent/types.ts`: added `runId` to `ENHANCE_MESSAGE` / `MEDIATE_MESSAGE`
      payloads and to `TOOL_RESULT_NEEDED` / `AGENT_COMPLETE` / `AGENT_ERROR` /
      `STREAM_TOKEN` / `STREAM_DONE`; added `AgentToolContext`.
- [x] `agent-tools.def.ts`: `callMain(toolName, args, runId)`; replaced the
      singleton `agentTools` with `createAgentTools(runId)` (each `execute`
      closes over the run id).
- [x] `ReActRunner`: added `setTools(tools)`.
- [x] `agent.worker.ts`: runs serialised through a promise queue; tools built per
      run; `runId` echoed on every emitted message; tool-set placeholder for INIT.
- [x] `agent-tools.ts`: `AgentToolContext` handlers; mindmap resolved from
      `ctx.mindmapId`; `getActiveConversation()` lookups and the module-level
      scope (`setAgentScope` / `clearAgentScope`) deleted.
- [x] `agent-tools.ts`: `getScopedTree(tree, scopeNodeId)` and
      `applyScopedOperations(tree, ops, scopeNodeId)` are pure; the
      "scope node missing → full tree" fallback is gone.
- [x] `useMindmapAgent.ts`: `runContextsRef` map seeded at send time
      (conversationId / mindmapId / scopeNodeId + runId); tool calls, errors and
      streaming routed by `runId`; unknown run context → `TOOL_ERROR`, never a
      tool execution.

## 3. P1 — reparent + scope-root deletion

- [x] `schema.ts`: `newParentId` added to `MindmapOperationSchema`.
- [x] `applyScopedOperations`: scope root deletion removes the node from the
      tree; a missing scope root aborts the batch; never persists
      `undefined`/`null` nodes.
- [x] `generateMindmapOps` returns `success: false, error: '作用域节点不存在…'`
      when the run scope is gone.
- [x] Tests: schema keeps `newParentId`; handler-level reparent moves the node;
      scoped add outside scope is skipped; scope-root deletion leaves a valid
      tree; missing scope aborts.

## 4. P1 — undo, status guard, worker lifecycle

- [x] New `src/lib/mindmap-history-bridge.ts`
      (`registerMindmapHistoryRecorder` / `recordAgentWrite`).
- [x] `agent-tools.ts`: records the pre-write snapshot before applying
      operations.
- [x] `MindMapTree.tsx`: registers the recorder (only for the active mindmap).
- [x] `useMindmapAgent.ts`: guard created with
      `getStatus: () => useChatStore.getState().agentStatus`.
- [x] `useMindmapAgent.ts`: cleanup terminates `workerRef.current`; run contexts
      cleared on unmount.
- [x] Tests: pre-write snapshot is recorded with the right mindmap id/tree.

## 5. P1 — theme consistency

- [x] `MindMapPanel.tsx`: passes `theme={theme}` to `MindMapTree`.
- [x] `MindMapTree.tsx`: `theme` prop forwarded to `FlowShell`; hard-coded
      `theme="light"` removed.
- [x] `useTheme.ts`: `applyTheme()` toggles both `.dark` and `.light`.
- [x] Tests: `.light` applied in light mode and removed in dark mode.

## 6. Verification

- [x] `npx tsc --noEmit` (renderer) → 0 errors.
- [x] `npx tsc --noEmit -p electron/tsconfig.json` → 0 errors.
- [x] `npx eslint .` → 0 errors / 7 warnings (all pre-existing, untouched files).
- [x] `npx vitest run` → 41 files / **470 tests passed** (457 existing + 13 new
      regression tests), no skips.
- [x] `npm run build` → electron-vite production build passes.
- [x] `openspec validate fix-agent-run-context-and-p1-defects --strict` passes.

## 7. Wrap-up

- [x] tasks checkboxes updated.
- [ ] Commit + push + PR (merge to `main` requires explicit approval).

## Notes / deliberately not covered

- The worker's promise-queue serialisation is verified by construction and by
  the protocol-level tests; there is no Worker harness in the test suite, so it
  is not unit-tested end-to-end.
- Move-up/down inversion, CSP, unused IndexedDB object stores and node
  provenance remain separate changes (see proposal Non-goals).
