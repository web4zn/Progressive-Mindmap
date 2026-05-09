## MODIFIED Requirements

### Requirement: Agent supports dual operation modes

The system SHALL support two agent modes: **enhance** (Agent operates in background) and **mediate** (Agent handles the conversation directly).

#### Scenario: User switches to mediate mode
- **WHEN** user clicks the mode toggle from "enhance" to "mediate"
- **THEN** the input placeholder changes to "与 Agent 对话..."
- **AND** messages are routed to the Agent Worker instead of the Chat API

#### Scenario: User sends message in enhance mode
- **WHEN** user sends a message in enhance mode
- **THEN** the message is sent to the Chat API via `streamChat()` with `useConversation` hook
- **AND** the AI response streams token-by-token
- **AND** when streaming completes, the Agent Worker receives `ENHANCE_MESSAGE` for background mindmap update

#### Scenario: User sends message in mediate mode
- **WHEN** user sends a message in mediate mode
- **THEN** the message is sent to the Agent Worker via `MEDIATE_MESSAGE` event
- **AND** the Agent Worker executes its reasoning loop (readMindmap → generateMindmapOps → stream response)
- **AND** the final response streams token-by-token to the chat panel via `STREAM_TOKEN` events
- **AND** a `STREAM_DONE` event marks completion

#### Scenario: User switches back to enhance mode
- **WHEN** user clicks the mode toggle from "mediate" to "enhance"
- **THEN** input placeholder reverts to default
- **AND** subsequent messages are routed to the Chat API

#### Scenario: Agent activity panel hides in mediate mode
- **WHEN** Agent is in mediate mode and processing a message
- **THEN** the `AgentActivityPanel` is not displayed (the Agent itself is the conversational entity)
- **AND** the user sees the Agent's streaming response directly in the chat
