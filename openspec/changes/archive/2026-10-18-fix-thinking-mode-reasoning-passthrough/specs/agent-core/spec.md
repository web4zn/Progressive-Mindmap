## ADDED Requirements

### Requirement: Thinking-mode reasoning is preserved across tool rounds

The agent runtime SHALL use an OpenAI-compatible model transport that maps
assistant `reasoning` parts to the `reasoning_content` field of outgoing
requests and parses `reasoning_content` from incoming responses.

For every ReAct tool round the runner SHALL append to the conversation:

- one assistant message containing a `reasoning` part whenever the response
  carried a chain of thought, followed by any response text and one
  `tool-call` part per emitted call (each carrying `toolCallId`, `toolName`,
  and `input`); and
- one `tool` message whose `tool-result` parts carry the matching
  `toolCallId`s.

Because a `tools`-carrying request must pass back the `reasoning_content` of
every previous assistant turn, the runner SHALL echo the reasoning on each
such assistant turn, including turns where the model made no tool call. It
SHALL NOT fabricate a reasoning part for a response that produced none, so
non-thinking providers are unaffected.

Tool calls whose arguments the SDK could not parse or execute SHALL be
answered with `error-text` tool results rather than a fabricated assistant
text message, so every `tool-call` keeps exactly one matching `tool-result`.

#### Scenario: DeepSeek thinking model completes a tool round

- **WHEN** the agent runs on a DeepSeek thinking-mode model whose first response carries `reasoning_content` and a `generateMindmapOps` tool call
- **THEN** the second `generateText` request carries `tools` and includes that turn's reasoning, serialized as `reasoning_content`
- **AND** the request's `tool-call` is answered by a `tool`-role message with the same `tool_call_id`
- **AND** the API accepts the request instead of returning HTTP 400 ("The `reasoning_content` in the thinking mode must be passed back to the API")

#### Scenario: Non-thinking provider is unaffected

- **WHEN** the agent runs on a provider that returns no reasoning (official OpenAI chat completions, local Ollama)
- **THEN** the assistant turn contains no `reasoning` part and the request carries no `reasoning_content`
- **AND** the assistant tool-call turn and matching `tool` result turn are still threaded, and the loop completes normally

#### Scenario: Unparseable tool arguments still get a matching tool result

- **WHEN** the model emits a tool call whose arguments the SDK cannot parse or execute
- **THEN** the runner records the assistant `tool-call` turn and answers it with an `error-text` `tool-result` carrying the same `toolCallId`
- **AND** no fabricated assistant text message is appended to the history
- **AND** the loop continues to the next step instead of leaving a dangling tool call

#### Scenario: Cancellation during a thinking step still aborts

- **WHEN** the user cancels the run while the thinking-mode model is producing a response
- **THEN** the LLM call is aborted and the ReAct loop returns without issuing another request
- **AND** the worker reports `AGENT_CANCELLED` for that `runId`, so no partial tool-call or reasoning history is sent to the provider
