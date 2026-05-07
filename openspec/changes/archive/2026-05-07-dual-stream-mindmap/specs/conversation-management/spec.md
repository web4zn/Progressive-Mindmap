## MODIFIED Requirements

### Requirement: Chat history construction for LLM context
The system SHALL construct the LLM context using a hybrid strategy when `mindmap-as-context` mode is active:

- Serialized mindmap tree (as Markdown headings)
- Last 1-2 raw Q&A messages (for tone and wording nuance)
- Current user question

When `mindmap-as-context` is OFF (legacy mode or mindmap.tree is empty):
- Full raw conversation history is passed as before

**Change from previous**: Conversation history is no longer always passed in full. A hybrid context replaces it when mindmap is available.

#### Scenario: Hybrid context with existing mindmap
- **WHEN** conversation has 20 messages and mindmap has 50 nodes
- **THEN** LLM context = mindmap serialization + last 2 messages + current question

#### Scenario: Full history when mindmap is empty
- **WHEN** conversation has 20 messages and mindmap.tree is empty
- **THEN** LLM context = full 20 messages (legacy behavior)

