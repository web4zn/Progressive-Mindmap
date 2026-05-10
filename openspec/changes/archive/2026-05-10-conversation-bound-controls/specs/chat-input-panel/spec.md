## ADDED Requirements

### Requirement: Integrated chat input panel

The system SHALL provide an integrated chat input panel that combines model selection, agent mode selection, and message input in a single visual block.

#### Scenario: Input panel displays below message list
- **WHEN** a conversation is active and a provider is configured
- **THEN** the input panel SHALL render below the message list
- **AND** the input panel SHALL contain: a control row (model selector + agent mode toggle) and an input row (textarea + send button)
- **AND** the input panel SHALL use a two-row layout as its default presentation

#### Scenario: Input panel displays control row
- **WHEN** the input panel is rendered
- **THEN** the control row SHALL display the ModelSelector on the left side
- **AND** the control row SHALL display the Agent mode toggle on the right side
- **AND** both controls SHALL be visually distinct from the input row below

### Requirement: Input panel is conversation-bound

The input panel's model and agent mode values SHALL reflect the active conversation's configuration, not a global setting.

#### Scenario: Switching conversations updates input panel
- **WHEN** the user switches to a different conversation
- **THEN** the ModelSelector SHALL update to show the target conversation's provider/model
- **AND** the Agent mode toggle SHALL update to show the target conversation's agent mode
- **AND** the message input SHALL clear (waiting for new input)

### Requirement: Agent activity indicator in input panel

The system SHALL display the Agent status indicator as part of the input panel, below the input row.

#### Scenario: Agent activity shows during enhancement
- **WHEN** the Agent Worker is processing an `ENHANCE_MESSAGE` request
- **THEN** a status indicator SHALL appear at the bottom of the input panel
- **AND** it SHALL display the current Agent status (thinking / reading_mindmap / generating_mindmap / complete / error)

#### Scenario: Agent activity hides when idle
- **WHEN** the Agent has no pending work (status is `idle`)
- **THEN** no status indicator SHALL be shown in the input panel
