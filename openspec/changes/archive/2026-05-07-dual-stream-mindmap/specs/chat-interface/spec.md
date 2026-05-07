## MODIFIED Requirements

### Requirement: Streaming response display
The system SHALL display LLM responses as streaming Markdown text in the chat bubble. The stream SHALL be processed through a dual-stream parser that:
- Detects `<!--KNWL-->` and `<!--/KNWL-->` delimiters
- Strips delimiters and their content from the displayed text
- Accumulates knowledge JSON between delimiters for mindmap application
- Renders only the non-knowledge portion as Markdown in the chat bubble

**Change from previous**: Stream format changes from pure Markdown to Markdown with optional knowledge block. The knowledge block is invisible to the user.

#### Scenario: Knowledge block stripped from display
- **WHEN** LLM streams `Some answer text.<!--KNWL-->[...]<!--/KNWL-->`
- **THEN** chat bubble displays only `Some answer text.` with no visible marker or JSON

#### Scenario: Knowledge block arrives before display content
- **WHEN** first stream chunk is `<!--KNWL-->[{"label":"X"}]\n<!--/KNWL-->\nAnswer text`
- **THEN** system buffers knowledge block, applies it, and displays only `Answer text`

### Requirement: Stop generation
The stop generation function SHALL also discard any partially-received knowledge block. If the knowledge block was partially buffered when generation stops, it SHALL be discarded and not applied to the mindmap.

**Change from previous**: Knowledge blocks add partial state that must be cleaned up on abort.

#### Scenario: Stop during knowledge block
- **WHEN** user stops generation mid-stream while `<!--KNWL-->[...` has been received but `<!--/KNWL-->` has not
- **THEN** partial knowledge buffer is discarded, mindmap is not updated with partial data

### Requirement: Auto-sync mode (REMOVED)
**Reason**: Replaced by inline knowledge extraction during chat streaming.
**Migration**: Mindmap updates happen automatically during chat response, no separate auto-sync trigger needed.

### Requirement: Monitored conversation auto-generation (REMOVED)
**Reason**: Replaced by inline knowledge extraction. Each monitored conversation response inherently updates the mindmap via its knowledge block.
**Migration**: No action needed. Mindmap updates are now implicit.

### Requirement: Message display and layout
**Change**: The max-width of the chat area SHALL remain unchanged. The knowledge block stripping does not affect layout.

