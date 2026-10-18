## Purpose

Define the shared agent runtime: a `BaseAgent` LLM/tool abstraction, the `ReActRunner` reasoning loop, the separate system-prompt module, and a Worker that only routes messages.
## Requirements
### Requirement: BaseAgent provides unified LLM calling

The system SHALL provide a `BaseAgent` class that encapsulates LLM invocation and tool interaction for all agent implementations.

```typescript
abstract class BaseAgent {
  protected ctx: AgentContext
  abstract get name(): string
  protected async callLLM(params: CallLLMParams): Promise<LLMResponse>
  protected async callTool(name: string, args: unknown): Promise<unknown>
}

interface AgentContext {
  model: string
  systemPrompt: string
  providerConfig: { apiEndpoint: string; apiKey: string }
  onToolCall: (name: string, args: unknown) => Promise<unknown>
  onStatusReport: (status: AgentStatus, message?: string) => void
}
```

#### Scenario: Agent calls LLM with system prompt
- **WHEN** an agent invokes `this.callLLM({ messages, tools })`
- **THEN** the system SHALL send the messages + system prompt to the LLM
- **THEN** the response SHALL include text content and any tool calls

#### Scenario: Agent calls a tool
- **WHEN** an agent invokes `this.callTool('readMindmap', {})`
- **THEN** the system SHALL forward the call to the main thread via `onToolCall`
- **THEN** the result SHALL be returned to the agent

### Requirement: ReActRunner encapsulates reasoning loop

The system SHALL provide a `ReActRunner` class that orchestrates the tool-use reasoning loop independently of message routing.

```typescript
class ReActRunner {
  constructor(agent: BaseAgent, tools: ToolDefinition[])
  async run(userPrompt: string, options?: { maxSteps?: number }): Promise<string>
}
```

The ReActRunner SHALL:
- Accept a max of 5 steps per run
- Process tool calls and inject tool results back into the conversation
- Return the final text response when no more tool calls are needed
- Report status updates (thinking, reading_mindmap, generating_mindmap) at appropriate steps

#### Scenario: ReActRunner completes with tool calls
- **WHEN** the LLM calls `readMindmap` then `generateMindmapOps`
- **THEN** the ReActRunner SHALL execute both tools in sequence
- **THEN** the ReActRunner SHALL return the final LLM text response

#### Scenario: ReActRunner handles invalid tool call
- **WHEN** the LLM produces a tool call with invalid JSON parameters
- **THEN** the ReActRunner SHALL inject an error message into the conversation
- **THEN** the ReActRunner SHALL continue the loop (up to maxSteps)

### Requirement: System prompt lives in a separate module

The system prompt for the mindmap agent SHALL be defined in `src/lib/agent/system-prompt.ts` as an exported function.

```typescript
export function buildMindmapAgentPrompt(): string
```

The prompt SHALL include:
- Tool descriptions (readMindmap, generateMindmapOps)
- Workflow guidance (read → think → execute → respond)
- Operational rules (editedByUser protection, ID naming rules, 10 ops max, summary ≤ 50 chars)

#### Scenario: Prompt is imported by Worker and hook
- **WHEN** `agent.worker.ts` initializes the agent
- **THEN** it SHALL call `buildMindmapAgentPrompt()` to get the system prompt
- **THEN** `useMindmapAgent.ts` SHALL NOT contain inline prompt strings

### Requirement: Worker file only handles message routing

The `src/workers/agent.worker.ts` SHALL be reduced to message routing and orchestration only:

```
onmessage → switch(msg.type)
  INIT       → create BaseAgent + ReActRunner
  ENHANCE    → build user prompt → ReActRunner.run()
  MEDIATE    → build user prompt → ReActRunner.run()
```

The file SHALL NOT contain:
- ReAct loop logic (moved to ReActRunner)
- System prompt text (moved to system-prompt.ts)
- Tool definitions (already in agent.worker.ts as AI SDK tool objects, kept here)

#### Scenario: Worker routes ENHANCE_MESSAGE
- **WHEN** Worker receives ENHANCE_MESSAGE
- **THEN** it SHALL construct a user prompt from messages → call `runner.run(prompt)` → post AGENT_COMPLETE

#### Scenario: Worker routes MEDIATE_MESSAGE
- **WHEN** Worker receives MEDIATE_MESSAGE
- **THEN** it SHALL construct a user prompt → call `runner.run(prompt)` → post STREAM_TOKEN / STREAM_DONE

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

