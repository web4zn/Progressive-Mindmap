## ADDED Requirements

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
