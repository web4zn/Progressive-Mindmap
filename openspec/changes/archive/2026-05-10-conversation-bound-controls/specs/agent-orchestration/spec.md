## MODIFIED Requirements

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
- **THEN** the message is sent to the AI provider via `streamChat()`
- **AND** the AI response streams token-by-token to the MessageBubble
- **AND** when streaming completes, the Agent Worker receives an `ENHANCE_MESSAGE` event

#### Scenario: User sends message in mediate mode
- **WHEN** user sends a message in mediate mode
- **THEN** the message is sent to the Agent Worker via `MEDIATE_MESSAGE` event
- **AND** the Agent Worker begins its reasoning loop (analyze → tool calls → synthesize → respond)

### Requirement: Agent activity is visible to user

The system SHALL display Agent status information so the user knows what the Agent is doing.

#### Scenario: Agent activity indicator shows during background enhancement
- **WHEN** the Agent Worker is processing an `ENHANCE_MESSAGE` request
- **THEN** the status indicator appears at the bottom of the input panel
- **AND** the status updates in real-time as the Agent progresses through steps (thinking / reading_mindmap / generating_mindmap / complete)

#### Scenario: Agent activity indicator hides when idle
- **WHEN** the Agent has no pending work and status is `idle`
- **THEN** the status indicator is not rendered

## ADDED Requirements

### Requirement: Agent Worker uses latest conversation configuration

The Agent Worker SHALL use the conversation's latest provider and model configuration when processing messages, to support per-conversation model selection.

#### Scenario: ENHANCE_MESSAGE uses active conversation's provider and model
- **WHEN** the Agent Worker receives an `ENHANCE_MESSAGE`
- **THEN** the message payload SHALL include `providerConfig` and `model` fields
- **AND** the Worker SHALL recreate its `languageModel` with these values before processing
- **AND** this ensures the Worker uses the correct model even when switching between conversations with different providers
