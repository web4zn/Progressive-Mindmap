## MODIFIED Requirements

### Requirement: MindMap corpus field
The `MindMap.corpus` field is retained as a secondary data source. Its role changes:

- **Inline extraction**: New knowledge from chat responses bypasses the corpus entirely. Knowledge blocks go directly into the mindmap tree without creating CorpusEntry records.
- **Manual batch rebuild**: The corpus remains the input for the "从语料重构" feature. Users can still curate corpus entries and trigger full regeneration.
- **Monitoring**: The `monitoredConversationIds` field is retained. Monitored conversations have their responses automatically extracted via knowledge blocks (no corpus entry created).

**Change from previous**: Corpus is no longer the primary pathway for live mindmap generation. It becomes a curation tool for manual rebuilds only.

#### Scenario: New chat response adds knowledge directly
- **WHEN** AI responds in a monitored conversation
- **THEN** knowledge block is parsed and applied to mindmap directly (no CorpusEntry created, no corpus involved)

#### Scenario: User curates corpus for manual rebuild
- **WHEN** user explicitly adds messages to corpus via "加入语料库" button
- **THEN** CorpusEntry is created as before. These entries are available for manual "从语料重构".

### Requirement: Corpus UI in mindmap panel
The corpus list UI is retained but its purpose shifts from "source for live generation" to "source for manual rebuild curation". The corpus panel SHALL show only manually-curated entries (not auto-generated from monitored conversations).

**Change from previous**: Corpus list no longer auto-populates from monitored conversations.

