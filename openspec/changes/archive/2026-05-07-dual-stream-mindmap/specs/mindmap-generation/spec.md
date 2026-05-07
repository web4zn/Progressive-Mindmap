## MODIFIED Requirements

### Requirement: Generate mindmap from conversation history
The system SHALL generate mindmaps through TWO pathways:

1. **Inline extraction (primary)**: Every chat response carries a knowledge block with structured concepts. These are merged into the mindmap tree algorithmically in real-time. This is the primary generation pathway.
2. **Batch generation (fallback/manual)**: The existing `generateMindmap()` function is retained for manual "从语料重构" and as fallback when knowledge blocks are absent. This uses the full corpus + conversation history as input.

**Change from previous**: The primary generation pathway shifts from batch LLM call to inline extraction. Batch generation becomes a secondary path.

#### Scenario: Inline extraction updates mindmap
- **WHEN** chat response completes and knowledge block was parsed
- **THEN** knowledge nodes are applied to mindmap tree immediately (no trigger, no debounce, no second API call)

#### Scenario: Manual batch rebuild still works
- **WHEN** user clicks "从语料重构" in MindMapPanel
- **THEN** system uses existing `generateMindmap()` with full corpus + `forceFullRebuild: true`

### Requirement: Incremental update via full regeneration (MODIFIED)
Incremental mode is no longer used for live updates. It is retained only within the manual batch generation path.

**Change from previous**: Incremental mode scope reduced to manual batch generation only.

### Requirement: Generation state management (MODIFIED)
For inline extraction, the generation state is simpler:
- `idle`: No response in progress
- `streaming`: Chat response streaming, knowledge may be buffered
- `complete`: Chat response done, knowledge applied (if any)
- `error`: Chat response failed, no knowledge applied

The MindMapPanel no longer shows a separate "generating" state for inline extraction. Mindmap updates are silent.

**Change from previous**: Generation state is now unified with chat state. No separate generation progress UI for inline extraction.

### Requirement: Monitored conversation auto-generation (REMOVED)
**Reason**: Replaced by inline knowledge extraction. Every response inherently updates the mindmap.
**Migration**: No action needed. Auto-generation logic and 5s debounce are removed.

### Requirement: Auto-sync mode (REMOVED)
**Reason**: Inline extraction makes auto-sync unnecessary.
**Migration**: Remove `autoSync` flag and related UI.

