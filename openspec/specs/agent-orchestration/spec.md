## Purpose

Agent orchestration: enhance and mediate modes, run-scoped tool execution, worker configuration and user-visible activity status.
## Requirements
### Requirement: Agent supports dual operation modes

The system SHALL support two agent modes: **enhance** (Agent operates in background) and **mediate** (Agent handles the conversation directly).

Agent mode SHALL be per-conversation, not global. Each conversation independently stores and remembers its agent mode setting.

#### Scenario: User switches agent mode for a conversation
- **WHEN** user clicks the mode toggle in the input panel from "enhance" to "mediate"
- **THEN** the conversation's `agentMode` is updated to `'mediate'`
- **AND** the toggle indicator updates to show the current mode for that conversation

#### Scenario: Conversation remembers its agent mode across switches
- **WHEN** user switches from conversation A to conversation B and back to conversation A
- **THEN** conversation A retains its previously selected agent mode
- **AND** conversation B retains its own previously selected agent mode (which may differ from A)

#### Scenario: New conversation defaults to enhance mode
- **WHEN** a new conversation is created
- **THEN** its `agentMode` SHALL default to `'enhance'`

#### Scenario: User sends message in enhance mode
- **WHEN** user sends a message in enhance mode
- **THEN** the message is sent directly to the AI provider via `streamChat()`
- **AND** the AI response streams token-by-token to the MessageBubble
- **AND** when streaming completes, the Agent Worker receives an `ENHANCE_MESSAGE` event

#### Scenario: User sends message in mediate mode
- **WHEN** user sends a message in mediate mode
- **THEN** the message is sent to the Agent Worker via `MEDIATE_MESSAGE` event
- **AND** the Agent Worker begins its reasoning loop (analyze → tool calls → synthesize → respond)

### Requirement: Agent uses ToolLoopAgent for reasoning

The system SHALL use Vercel AI SDK v6 `ToolLoopAgent` as the reasoning engine for the Agent Worker.

#### Scenario: Agent performs multi-step reasoning
- **WHEN** the Agent Worker receives an enhancement request
- **THEN** it initializes a `ToolLoopAgent` instance with registered tools (readMindmap, generateMindmapOps)
- **AND** the agent iterates through reasoning steps until it produces a final result
- **AND** the agent is limited to a maximum of 10 steps via `stopWhen: stepCountIs(10)`

### Requirement: Agent activity is visible to user

The system SHALL display Agent status information so the user knows what the Agent is doing.

#### Scenario: Agent activity indicator shows during background enhancement
- **WHEN** the Agent Worker is processing an `ENHANCE_MESSAGE` request
- **THEN** the status indicator appears at the bottom of the input panel
- **AND** the status updates in real-time as the Agent progresses through steps (thinking / reading_mindmap / generating_mindmap / complete)

#### Scenario: Agent activity indicator hides when idle
- **WHEN** the Agent has no pending work and status is `idle`
- **THEN** the status indicator is not rendered

### Requirement: Agent Worker uses latest conversation configuration

The Agent Worker SHALL use the conversation's latest provider and model configuration when processing messages, to support per-conversation model selection.

#### Scenario: ENHANCE_MESSAGE uses active conversation's provider and model
- **WHEN** the Agent Worker receives an `ENHANCE_MESSAGE`
- **THEN** the message payload SHALL include `providerConfig` and `model` fields
- **AND** the Worker SHALL recreate its `languageModel` with these values before processing
- **AND** this ensures the Worker uses the correct model even when switching between conversations with different providers

### Requirement: Tool execution is run-scoped

Every agent run SHALL be bound to an immutable execution context identified by a
`runId`. The context SHALL carry `conversationId`, `mindmapId` and
`scopeNodeId` and SHALL be captured on the main thread when the run starts.

`ENHANCE_MESSAGE` / `MEDIATE_MESSAGE` payloads SHALL include the `runId`, and
every worker → main message that requires routing (`TOOL_RESULT_NEEDED`,
`AGENT_COMPLETE`, `AGENT_ERROR`, `STREAM_TOKEN`, `STREAM_DONE`) SHALL echo it.
Tool handlers SHALL resolve the target mindmap from the run context and SHALL
NOT use the currently active conversation.

The Agent Worker SHALL process runs sequentially: a request arriving while
another run is executing SHALL be queued, and each run SHALL receive its own
model, tool set and scope.

#### Scenario: Conversation switch during a background run

- **WHEN** an `ENHANCE_MESSAGE` run is in flight for conversation A and the user switches to conversation B
- **THEN** A's tool calls still resolve conversation A's linked mindmap
- **AND** conversation B's mindmap is not read from or written to

#### Scenario: Overlapping runs are serialised

- **WHEN** a `MEDIATE_MESSAGE` arrives while an `ENHANCE_MESSAGE` run is still executing
- **THEN** the worker queues the second run until the first finishes
- **AND** each run executes with its own model, tools and scope

#### Scenario: Streaming is routed by run

- **WHEN** the worker emits `STREAM_TOKEN` / `STREAM_DONE` for a run
- **THEN** the token is appended to the run's conversation
- **AND** the run's conversation (not the active one) is marked complete

#### Scenario: Unknown run context is rejected

- **WHEN** a `TOOL_RESULT_NEEDED` message references a `runId` with no registered context
- **THEN** the main thread replies with `TOOL_ERROR` instead of executing a tool
- **AND** no store mutation occurs

### Requirement: Run cancellation

The system SHALL allow the user to cancel an in-flight Agent run.

Cancellation SHALL abort the run's LLM call and terminate its ReAct loop before
the next step; no further tool calls SHALL be executed for the cancelled run.
The worker SHALL report `AGENT_CANCELLED` for that `runId`, and the main thread
SHALL clear the run context, return the agent status to `idle`, and finalise any
streaming assistant message owned by the run.

Cancelling an unknown or already-finished run SHALL be a no-op.

#### Scenario: Cancel a background enhancement

- **WHEN** an `ENHANCE_MESSAGE` run is in flight and the user cancels it
- **THEN** the LLM call is aborted, the ReAct loop stops, and the agent status returns to `idle`
- **AND** no further mindmap operations are applied for that run

#### Scenario: Cancel a mediate run

- **WHEN** a `MEDIATE_MESSAGE` run is streaming and the user cancels it
- **THEN** the run stops and its streaming assistant message is marked complete with the content received so far
- **AND** the agent status returns to `idle`

#### Scenario: Cancel an unknown run

- **WHEN** a cancellation targets a `runId` that has no active context
- **THEN** the system ignores it and no status or message changes

