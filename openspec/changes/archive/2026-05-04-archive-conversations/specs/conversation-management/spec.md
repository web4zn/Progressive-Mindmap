## MODIFIED Requirements

### Requirement: Conversation data model
The Conversation entity SHALL include an optional `archived` field defaulting to `false`, indicating whether the conversation has been archived.

#### Scenario: New conversation is not archived
- **WHEN** a new conversation is created
- **THEN** `archived` is `false` by default

#### Scenario: Archived conversation is persisted
- **WHEN** a conversation is archived and the page is refreshed
- **THEN** the `archived` state is preserved via IndexedDB persistence

### Requirement: Active conversation list filtering
The sidebar SHALL display archived conversations in a separate collapsible section below the active list.

#### Scenario: Archived section is hidden when empty
- **WHEN** no conversations are archived
- **THEN** the archived section is not rendered
