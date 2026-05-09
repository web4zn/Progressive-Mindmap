## ADDED Requirements

### Requirement: Agent runs in a dedicated Web Worker

The system SHALL run the Agent orchestration logic in a dedicated Web Worker thread to avoid blocking the main UI thread.

#### Scenario: Worker is created on first agent need
- **WHEN** the user has an active conversation with a configured provider
- **AND** a linked mindmap exists
- **THEN** `useMindmapAgent.initialize()` creates a new `Worker` instance
- **AND** sends an `INIT` message with provider config and model settings
- **AND** the Worker acknowledges by entering idle state

#### Scenario: Worker is terminated on unmount
- **WHEN** the React component using `useMindmapAgent` unmounts
- **THEN** the cleanup function calls `worker.terminate()`
- **AND** the Worker is properly disposed

### Requirement: Main-Worker communication follows a typed protocol

The system SHALL define TypeScript types for all messages exchanged between the main thread and the Agent Worker.

#### Scenario: Worker requests tool execution from main thread
- **WHEN** the Agent Worker determines it needs to execute a tool (e.g., readMindmap)
- **THEN** it sends a `TOOL_RESULT_NEEDED` message with `callId` and `args`
- **AND** the main thread executes the corresponding handler from `agentToolHandlers`
- **AND** sends back a `TOOL_RESULT` message with the same `callId`
- **AND** the Worker resumed with the tool result

#### Scenario: Worker posts status updates
- **WHEN** the Agent Worker makes progress during its reasoning loop
- **THEN** it sends `AGENT_STATUS` messages with the current status value
- **AND** the main thread updates the `AgentActivityPanel` accordingly

#### Scenario: Worker reports completion
- **WHEN** the Agent Worker finishes processing an `ENHANCE_MESSAGE` request
- **THEN** it sends an `AGENT_COMPLETE` message with the generated operations
- **AND** the main thread applies the operations to the mindmap store

### Requirement: Worker tool execution round-trip

The system SHALL support a round-trip pattern where the Worker initiates tool calls but the main thread executes them.

#### Scenario: Tool result is returned with correct callId matching
- **WHEN** the main thread receives a `TOOL_RESULT_NEEDED` message
- **THEN** it looks up the tool name in `agentToolHandlers` registry
- **AND** executes the handler with the provided args
- **AND** posts a `TOOL_RESULT` message back with the original `callId`
- **AND** the Worker resolves the pending promise with the result
