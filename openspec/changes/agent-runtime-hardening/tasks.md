# Tasks — agent runtime hardening

Legend: `[ ]` pending · `[x]` done.

## 1. Scaffolding

- [x] `proposal.md` + `tasks.md` + spec deltas (agent-orchestration,
      mindmap-node-editing, chat-interface, model-provider).
- [x] `openspec validate agent-runtime-hardening --strict` passes.

## 2. Move up / move down

- [x] `MindMapTree.tsx`: `handleMoveUp` → `moveNode(..., 'up')`,
      `handleMoveDown` → `moveNode(..., 'down')`.
- [x] Extracted pure guards to `src/lib/mindmap-move.ts`:
      `canMoveUp(index)`, `canMoveDown(index, siblingCount)`; the tree now uses
      them (previous guards were inverted too).
- [x] Tests: `mindmap-move.test.ts` (5 cases: first/last/missing-index/single).

## 3. Run cancellation

- [x] `agent/types.ts`: `CANCEL_RUN` (main → worker) and `AGENT_CANCELLED`
      (worker → main), both with `runId`.
- [x] `agent.worker.ts`: per-run `AbortController`; `CANCEL_RUN` aborts the
      active run or marks a queued run as cancelled; abort path posts
      `AGENT_CANCELLED` (never `AGENT_ERROR`).
- [x] `ReActRunner.run(userPrompt, signal?)`: forwards `abortSignal`, checks
      between steps, returns quietly on abort.
- [x] `useMindmapAgent`: `cancelAgent()`, `AGENT_CANCELLED` handling (clear run
      context, finalise streaming message, status → idle).
- [x] `AgentActivityPanel`: "取消" button for in-flight statuses, wired through
      `ChatInputPanel` ← `ChatPage`.

## 4. Streaming retry

- [x] `llm-client.ts`: `isRetryableError` + `streamChatWithRetry`
      (retry only before the first yielded batch; 2 retries, 500 ms/1 s;
      abort-safe; 4xx not retried; configurable for tests).
- [x] `useConversation.ts`: uses `streamChatWithRetry`.
- [x] Tests: retry-before-first-token, no-retry-after-partial, abort, 401,
      retry-exhaustion.

## 5. Local providers

- [x] New `src/lib/provider-utils.ts` (`isLocalEndpoint`, `requiresApiKey`,
      `normalizeEndpoint`, `resolveApiKey`).
- [x] `ProviderSettingsPage`: key optional for local endpoints; "fetch models"
      works without a key for local endpoints; placeholder hints updated.
- [x] `llm-client.createClient` and `agent.worker.createModel`: normalise the
      endpoint and use a placeholder key for local endpoints.
- [x] Tests: provider-utils (7 cases) and client normalisation.

## 6. Verification

- [x] `npx tsc --noEmit` (renderer) → 0 errors.
- [x] `npx tsc --noEmit -p electron/tsconfig.json` → 0 errors.
- [x] `npx eslint .` → 0 errors / 7 warnings (pre-existing).
- [x] `npx vitest run` → 43 files / **490 tests passed** (470 existing + 20 new).
- [x] `npm run build` → electron-vite production build passes.
- [x] `openspec validate agent-runtime-hardening --strict` passes.
- [x] Version bumped to **1.0.2** per the AGENTS.md rule.

## 7. Wrap-up

- [x] tasks checked.
- [x] Commit + push + PR + merge; release workflow publishes `v1.0.2`.
- [ ] Archive this change after merge.
