## ADDED Requirements

### Requirement: User can archive a conversation
The system SHALL allow users to archive a conversation, hiding it from the active list while preserving all associated data.

#### Scenario: Archive from active list
- **WHEN** user clicks "归档" on an active conversation
- **THEN** the conversation disappears from the active list
- **AND** appears in the archived section
- **AND** its CorpusEntry references remain valid and functional

### Requirement: User can unarchive a conversation
The system SHALL allow users to restore an archived conversation back to the active list.

#### Scenario: Unarchive from archived section
- **WHEN** user clicks "取消归档" on an archived conversation
- **THEN** the conversation reappears in the active list
- **AND** maintains all messages, mindmap associations, and corpus entries

### Requirement: Archived conversations stay in corpus
Archived conversations SHALL remain fully functional as corpus source material for mindmap generation.

#### Scenario: Generate mindmap with archived conversation corpus
- **WHEN** a mindmap has corpus entries referencing messages from an archived conversation
- **THEN** the generation uses those messages normally without errors or missing data
