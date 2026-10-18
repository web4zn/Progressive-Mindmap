# Tasks — thinking-mode reasoning passthrough

Legend: `[ ]` pending · `[x]` done.

## 1. Scaffolding

- [x] `proposal.md` + `tasks.md` + spec delta (`agent-core`).
- [x] `openspec validate fix-thinking-mode-reasoning-passthrough --strict` passes.

## 2. Transport

- [x] `src/workers/agent.worker.ts` `createModel`: `createOpenAI(...).chat(id)` →
      `createOpenAICompatible({ name: 'progressive-mindmap', baseURL, apiKey })
      .chatModel(id)`, so assistant `reasoning` is sent as `reasoning_content`
      and parsed back from the response.
- [x] `package.json` / `package-lock.json`: add `@ai-sdk/openai-compatible@^2`,
      remove `@ai-sdk/openai` (the agent transport was its only user).
- [x] Version bump `1.0.4` → `1.0.5` (patch, per the AGENTS.md release rule).

## 3. Message threading

- [x] `ReActRunner.run()` keeps `ModelMessage[]` history: after each tool round
      it pushes one assistant message (`reasoning` + optional `text` +
      `tool-call` parts with `toolCallId` / `toolName` / `input`) and one `tool`
      message (`tool-result` parts keyed by the same `toolCallId`s).
- [x] `buildAssistantMessage()` / `buildToolMessage()` construct those turns;
      `output` normalized to `{type:'text'}` for strings and `{type:'json'}`
      otherwise; no `JSON.stringify({tool, result})` fabricated assistant text.
- [x] Reasoning echoed only when the response actually produced it (no empty
      `reasoning` part), so non-thinking providers send no `reasoning_content`.
- [x] Tool calls the SDK could not execute (unparseable arguments) are answered
      with `{type:'error-text'}` tool results, keeping the tool-call /
      tool-result pairing valid, instead of appending a fabricated assistant
      message.
- [x] `buildToolMessage()` maps over the *calls* (not the results) and falls
      back to an `error-text` result for any call missing one, so a tool whose
      handler threw (`toolResults` shorter than `toolCalls`) still gets exactly
      one matching `tool-result`.

## 4. Regression guard

- [x] `src/lib/agent/__tests__/ReActRunner.test.ts`: local mock
      OpenAI-compatible HTTP server enforcing DeepSeek's rule (a `tools`
      request whose assistant message omits `reasoning_content` → 400);
      asserts the second request echoes the first turn's reasoning and carries
      a `tool` turn with the matching `tool_call_id`; also asserts a
      non-thinking model gets no `reasoning_content`, and covers the
      `error-text` and text/json output builders.

## 5. Verification

- [x] `npx tsc --noEmit` (renderer) + `-p electron/tsconfig.json` → 0 errors.
- [x] `npx eslint .` → 0 errors (7 pre-existing warnings unchanged).
- [x] `npx vitest run` → 45 files / 510 tests pass, including
      `ReActRunner.test.ts`.
- [x] `npm run build` → electron-vite production build passes (entry 933 kB).
- [x] Re-run `openspec validate fix-thinking-mode-reasoning-passthrough --strict`
      after the final code state lands.
