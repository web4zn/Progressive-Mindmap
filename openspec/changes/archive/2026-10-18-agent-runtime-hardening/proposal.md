# Harden the agent runtime: move semantics, cancellation, streaming retry, local providers

> Runtime-reliability change. No data-model or UI redesign; every item fixes a
> behaviour that was documented or expected but did not work.

## Why

Four runtime gaps remain after the P0/P1 fixes:

| # | Defect | Evidence |
| --- | --- | --- |
| 1 | "上移 / 下移" are inverted: the 上移 handler calls `moveNode(..., 'down')` and the enable-guards are inverted the same way. | `MindMapTree.tsx` (`handleMoveUp` / `handleMoveDown`, `checkCanMoveUp` / `checkCanMoveDown`) |
| 2 | An in-flight Agent run cannot be cancelled. The stop button only aborts the chat stream (`ChatInputPanel` → `useConversation.handleStop`); the worker keeps looping up to 15 ReAct steps and its tools keep writing. | `ReActRunner.run()` has no `AbortSignal`; worker has no cancel channel |
| 3 | The chat stream has **no retry** at all. Removing the dead `streamChatWithRetry` left `useConversation` calling `streamChat` directly, so a transient network error / 429 fails the message permanently. | `src/hooks/useConversation.ts`; `src/lib/llm-client.ts` |
| 4 | Local providers are blocked by the settings form: `validate()` always requires an API key, and "fetch models" is disabled without one — so the Ollama preset (`http://localhost:11434/v1`, spec says the key may be empty) cannot be used. The worker also builds its baseURL without trimming a trailing slash. | `ProviderSettingsPage.tsx` (`validate`, `handleFetchModels`); `agent.worker.ts` (`createModel`) |

## What Changes

### 1. Move up / move down semantics (fixes #1)

Swap the direction arguments and their enable-guards so 上移 = index − 1 and
下移 = index + 1, with the menu items disabled at the edges.

### 2. Run cancellation (fixes #2)

- New `CANCEL_RUN` main → worker message and `AGENT_CANCELLED` worker → main
  message, both carrying `runId`.
- The worker keeps an `AbortController` per active run; `CANCEL_RUN` aborts it.
- `ReActRunner.run(userPrompt, signal?)` forwards the signal to
  `generateText()` and exits quietly when the run is aborted.
- `useMindmapAgent` exposes `cancelAgent()`; `AgentActivityPanel` shows a
  "取消" button while a run is in flight, wired through `ChatInputPanel`.
- Cancelled mediate runs finalise their streaming assistant message; the status
  returns to `idle`.

### 3. Streaming retry (fixes #3)

`streamChatWithRetry` is reintroduced with correct semantics:

- retries only **before the first token** was yielded (no duplicated content),
- retries only retryable failures (connection errors, HTTP 429, HTTP 5xx),
- never retries an abort,
- at most 2 retries with exponential backoff (500 ms, 1 s).

### 4. Local provider support (fixes #4)

- New pure helpers (`src/lib/provider-utils.ts`): `isLocalEndpoint`,
  `requiresApiKey`, `normalizeEndpoint`.
- Settings form: the key is required only for non-local endpoints, and "fetch
  models" works without a key for local endpoints.
- `createClient` / the worker's `createModel` normalise the endpoint (strip a
  trailing `/`) and substitute a placeholder key for local endpoints, because
  the OpenAI SDK rejects an empty key.

## Non-goals

- Mid-stream retry with token de-duplication (deliberately not attempted; we
  fail the message instead of duplicating partial output).
- Provider-key encryption via Electron safeStorage, CSP, remote-resource
  sanitisation — separate security change.
- Replacing the chat SDK or the Agent tool loop.

## Capabilities

### Modified Capabilities

- `agent-orchestration` — adds run cancellation.
- `mindmap-node-editing` — pins the move up / move down direction.
- `chat-interface` — adds the streaming retry policy.
- `model-provider` — local endpoints may omit the API key.

## Impact

- Files: `MindMapTree.tsx`, `agent/types.ts`, `agent.worker.ts`,
  `ReActRunner.ts`, `useMindmapAgent.ts`, `AgentActivityPanel.tsx`,
  `ChatInputPanel.tsx`, `ChatPage.tsx`, `llm-client.ts`, `useConversation.ts`,
  `ProviderSettingsPage.tsx`, new `provider-utils.ts`.
- Tests: retry policy (before/after first token, abort, 4xx), provider helpers,
  client normalisation, move guards.
- No persisted-data change.
