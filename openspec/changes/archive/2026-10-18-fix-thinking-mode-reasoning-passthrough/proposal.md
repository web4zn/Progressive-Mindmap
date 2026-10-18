# Preserve thinking-mode reasoning across ReAct tool rounds

> Agent-runtime correctness change. No data-model, IPC-protocol, or UI redesign:
> the mindmap agent's ReAct loop must record real assistant tool-call turns with
> their chain of thought, or a thinking-mode model rejects the second LLM call.

## Why

The enhance / mediate agent runs a manual ReAct loop in a Web Worker with
`generateText` from the Vercel AI SDK. Against a thinking-mode model (DeepSeek
`deepseek-flash` / `deepseek-v4-pro`, thinking on by default) the second LLM
call failed with:

```
AI_APICallError: The `reasoning_content` in the thinking mode must be passed back to the API.
```

Two defects caused it:

| # | Defect | Evidence |
| --- | --- | --- |
| 1 | The transport could not carry reasoning at all: `@ai-sdk/openai`'s chat model neither parses `reasoning_content` from the response nor sends it back. | `src/workers/agent.worker.ts` (`createModel`) |
| 2 | The message history was structurally wrong: after each tool round the loop appended a fabricated **assistant** text message containing `JSON.stringify({tool, result})` instead of an assistant `tool_calls` turn paired with a `tool`-role result message. Even with a correct transport the assistant turns had no reasoning to echo, and the tool-call / tool-result pairing was not valid. | `src/lib/agent/ReActRunner.ts` (`run`) |

DeepSeek's published contract (https://api-docs.deepseek.com/guides/thinking_mode)
is that in thinking mode the chain of thought is returned in `reasoning_content`,
a sibling of `content`, and that:

- **if the request carries the `tools` parameter, the `reasoning_content` of all
  previous turns MUST be passed back — even for turns where the model did not
  perform a tool call — otherwise the API returns HTTP 400**;
- if the request has no `tools`, `reasoning_content` need not be passed back and
  is ignored if sent.

## What Changes

### 1. OpenAI-compatible transport (fixes #1)

`createModel` in `src/workers/agent.worker.ts` switches from
`createOpenAI(...).chat(id)` to
`createOpenAICompatible({ name: 'progressive-mindmap', baseURL, apiKey }).chatModel(id)`.

`@ai-sdk/openai-compatible@2` maps assistant `reasoning` parts to
`reasoning_content` on outbound requests and parses `reasoning_content` on
inbound responses. `@ai-sdk/openai` is dropped — those two files were its only
users — and `@ai-sdk/openai-compatible` becomes a direct dependency.

### 2. Real tool-round message history (fixes #2)

`ReActRunner` threads `ModelMessage[]` history instead of appending fabricated
assistant text:

- one assistant message per tool round containing `{type:'reasoning'}` (only
  when the response carried reasoning), optional `{type:'text'}`, and one
  `{type:'tool-call'}` part per emitted call carrying
  `toolCallId` / `toolName` / `input`;
- one `tool` message whose `{type:'tool-result'}` parts reuse the matching
  `toolCallId`s, with `output` normalized to `{type:'text'}` for strings and
  `{type:'json'}` otherwise;
- tool calls the SDK could not execute (unparseable arguments) are answered
  with `{type:'error-text'}` tool results instead of a fabricated assistant
  message, so every `tool-call` keeps exactly one matching `tool-result`; the
  same fallback covers a handler that threw, where `toolResults` is shorter
  than `toolCalls`.

### 3. Reasoning echoed only when produced

No empty `reasoning` part is fabricated, so non-thinking providers (official
OpenAI chat completions, local Ollama) receive no `reasoning_content` and are
unaffected.

### 4. Regression guard

A unit test (`src/lib/agent/__tests__/ReActRunner.test.ts`) runs the loop
against a local mock OpenAI-compatible HTTP server that mirrors DeepSeek's rule
— a `tools` request containing any assistant message without
`reasoning_content` fails — and asserts the second request carries the first
turn's reasoning plus matching `tool_call_id`s.

## Non-goals

- Streaming or displaying the chain of thought in the UI; reasoning is not
  persisted in IndexedDB or in the agent's message display.
- Changing the chat stream stack (`openai` SDK in `src/lib/llm-client.ts`): it
  sends no `tools`, so the contract does not apply there.
- Retrying or special-casing a 400 from a thinking-mode provider.
- Replacing the ReAct loop or the AI SDK.

## Capabilities

### Modified Capabilities

- `agent-core` — the ReAct loop records reasoning-bearing assistant tool-call
  turns plus matching `tool` result turns.

## Impact

- Files: `src/workers/agent.worker.ts` (`createModel`),
  `src/lib/agent/ReActRunner.ts` (message construction and loop),
  `package.json` / `package-lock.json` (provider swap), `AGENTS.md` (agent
  transport description), new `src/lib/agent/__tests__/ReActRunner.test.ts`.
- Version bumped `1.0.4` → `1.0.5` (patch: bug fix that ships code, per
  `AGENTS.md`).
- Tests: thinking-mode reasoning echo, matching tool-call / tool-result ids,
  non-thinking provider unaffected, unexecuted tool calls answered with error
  results.
- No persisted-data change; no Worker message-type change; existing enhance and
  mediate flows keep the same inputs and outputs.
