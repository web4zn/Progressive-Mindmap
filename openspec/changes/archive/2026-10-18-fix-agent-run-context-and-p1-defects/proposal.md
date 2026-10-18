# Fix agent run context (P0) and P1 defects: reparent, undo, status, theme

> Correctness-first change. The P0s can write into the wrong mindmap; the P1s
> make documented features silently do nothing or render wrong. No data-model
> change, no UI redesign.

## Why

The audit of the Agent pipeline found that tool execution has **no run identity**
and relies on process-global mutable state, which breaks as soon as the user acts
while a background run is in flight.

| # | Severity | Defect | Evidence |
| --- | --- | --- | --- |
| 1 | P0 | `generateMindmapOps` and every query tool resolve the target mindmap with `getActiveConversation()` *at tool-execution time*. Switching conversations mid-run makes the agent read/write the wrong mindmap. | `src/lib/agent/agent-tools.ts:243,269,…`; payload `conversationId` never reaches the handler |
| 2 | P0 | Agent scope is a module-level `let scopeNodeId`. Every send overwrites it; an in-flight tool call reads the newest scope, and a missing scope node silently falls back to a **full-tree write**. | `src/lib/agent/agent-tools.ts:13,19-28,47-50,87-89` |
| 3 | P1 | `reparent` is unreachable: Zod schema has no `newParentId` and strips it, so `applyOperations` always reports "target parent not found". | `src/lib/agent/schema.ts:9-18` vs `agent-tools.ts:515-553` |
| 4 | P1 | Deleting the scope root leaves `updatedWrapped[0]` empty and persists `undefined` as a tree node. | `agent-tools.ts:92-98` |
| 5 | P1 | Agent writes bypass the undo timeline; the user cannot undo an AI edit, and a later undo jumps over it to an older snapshot. | `src/hooks/useMindmapHistory.ts`; only user actions call `record()` |
| 6 | P1 | The status guard is created without `getStatus`, so its default `() => 'idle'` means `complete` / `error` never auto-recover; the pill can stick. | `useMindmapAgent.ts:32`; `agent-status-guard.ts:73,106` |
| 7 | P1 | The canvas is hard-wired to the light theme, so dark mode only themes the shell. And `applyTheme()` never writes `.light`, so choosing light on a dark OS is overridden by the `:root:not(.light)` fallback. | `MindMapTree.tsx:1022`; `useTheme.ts:51-56`; `index.css:234` |
| 8 | P1 | The worker cleanup effect snapshots `workerRef.current` at mount (always `null`), so the worker is never terminated on unmount. | `useMindmapAgent.ts:350-356` vs `:223` |

## What Changes

### 1. Run-scoped tool context (fixes #1, #2)

- Every `ENHANCE_MESSAGE` / `MEDIATE_MESSAGE` carries a `runId`; the hook keeps
  `runId → { conversationId, mindmapId, scopeNodeId }` for the lifetime of the run.
- Worker → main messages (`TOOL_RESULT_NEEDED`, `AGENT_COMPLETE`, `AGENT_ERROR`,
  `STREAM_TOKEN`, `STREAM_DONE`) echo the `runId`. Streaming/error routing uses the
  run's conversation instead of whichever conversation is active.
- Tool handlers become `(args, ctx: AgentToolContext)`; `generateMindmapOps` and
  the query tools use `ctx.mindmapId` (never `getActiveConversation()`).
- The module-level scope is deleted. `getScopedTree(tree, scopeNodeId)` and
  `applyScopedOperations(tree, ops, scopeNodeId)` are pure functions of their
  arguments; dropping the fallback-to-full-tree behavior.
- The worker serialises runs through a promise queue and builds a fresh tool set
  per run (`createAgentTools(runId)`), so overlapping enhance/mediate requests
  cannot swap each other's model, tools or scope.

### 2. `reparent` works end-to-end (fixes #3)

- Add `newParentId` to `MindmapOperationSchema`. The existing `applyOperations`
  implementation already validates self / descendant / edited-node targets.
- Add a scoped-delete guard: when the scope root itself is deleted, remove it
  from the tree instead of persisting `undefined` (fixes #4).

### 3. Agent writes are undoable (fixes #5)

- Small bridge module: the tree registers a history recorder, `agent-tools`
  notifies it with the pre-write snapshot. Agent writes now push onto the same
  undo timeline as user edits; undo/redo remains a UI-layer concern.

### 4. Status guard and worker lifecycle (fixes #6, #8)

- Pass `getStatus: () => useChatStore.getState().agentStatus` so the 5 s
  safety net can actually revert `complete` / `error`.
- Terminate via `workerRef.current` in cleanup; terminate on`onerror` paths stay
  unchanged.

### 5. Theme consistency (fixes #7)

- `MindMapPanel` passes the resolved theme down to `MindMapTree` → `FlowShell`
  (`theme={theme}`), removing the hard-coded `"light"`.
- `applyTheme()` toggles both `.dark` and `.light` classes so the
  `:root:not(.light)` first-paint fallback can be disabled by an explicit
  light choice, and removes ambiguity when the OS preference differs.

## Non-goals

- Move-up/down inversion, CSP, unused IndexedDB object stores, no-provenance
  node annotation — separate changes.
- Three-state theme selector. The product ships two switchable modes; system
  preference remains a first-paint fallback only.
- Redesigning the status pill or the Agent Activity panel.

## Capabilities

### Modified Capabilities

- `agent-orchestration` — tool context becomes run-scoped; runs are serialised
  and mode/streaming messages are routed by `runId`.
- `mindmap-incremental` — `reparent` documented as a supported operation;
  scope-limited application and scope-root deletion specified.
- `mindmap-ui-stage-d` — theme requirement restated for two modes plus
  canvas consistency (FlowShell follows the resolved theme; explicit light
  disables the OS fallback).

## Impact

- Files: `agent/types.ts`, `agent-tools.ts`, `schema.ts`, new
  `mindmap-history-bridge.ts`, `useMindmapAgent.ts`, `agent.worker.ts`,
  `agent-tools.def.ts`, `ReActRunner.ts` (setTools), `MindMapTree.tsx`,
  `MindMapPanel.tsx`, `useTheme.ts`.
- Tests: schema reparent, run-context isolation (wrong-active-conversation
  regression), scope confinement, scope-root deletion, theme classes, and the
  existing agent/hook suites.
- No persisted-data or IPC-contract change.
