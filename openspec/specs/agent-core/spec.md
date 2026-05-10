## ADDED Requirements

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
