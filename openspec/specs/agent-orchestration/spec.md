## ADDED Requirements

### Requirement: Agent supports dual operation modes

The system SHALL support two agent modes: **enhance** (Agent operates in background) and **mediate** (Agent handles the conversation directly).

#### Scenario: User switches to mediate mode
- **WHEN** user clicks the mode toggle switch from "enhance" to "mediate"
- **THEN** the chat input UI changes to show "Talk to Agent" instead of "Talk to AI"
- **AND** the mode toggle indicator updates to show the current mode

#### Scenario: User sends message in enhance mode
- **WHEN** user sends a message in enhance mode
- **THEN** the message is sent directly to the AI provider via `streamChat()`
- **AND** the AI response streams token-by-token to the MessageBubble
- **AND** when streaming completes, the Agent Worker receives an `ENHANCE_MESSAGE` event

#### Scenario: User sends message in mediate mode
- **WHEN** user sends a message in mediate mode
- **THEN** the message is sent to the Agent Worker via `AGENT_CHAT` event
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
- **THEN** the `AgentActivityPanel` component displays the current status (thinking / reading_mindmap / generating_mindmap / complete)
- **AND** the status updates in real-time as the Agent progresses through steps

#### Scenario: Agent activity panel hides when idle
- **WHEN** the Agent has no pending work and status is `idle`
- **THEN** the `AgentActivityPanel` is not rendered (returns null)
