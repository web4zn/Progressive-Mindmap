## Purpose

Use the accumulated mindmap tree as LLM long-term context instead of raw conversation history. This reduces prompt token usage by 60-80% while providing better-organized context for more accurate responses.

## Requirements

### Requirement: Mindmap tree serialization for context
The system SHALL serialize the mindmap tree into a compact Markdown format for use as LLM context. The serialization SHALL:
- Use Markdown headings (`#`/`##`/`###`) to represent tree depth
- Include node label and summary for each node
- Omit source tracking, content field, and metadata
- Limit to the first 200 nodes (configurable ceiling)
- Prefix with a header: "## Knowledge Graph Context"

#### Scenario: Serialize tree to context
- **WHEN** mindmap has 3 nodes: `React` > `Hooks` > `useState`
- **THEN** serialized context looks like: `## Knowledge Graph Context\n# React\n## Hooks\n### useState -- basic state hook`

#### Scenario: Truncate at node limit
- **WHEN** mindmap has 300 nodes and ceiling is 200
- **THEN** serialization includes first 200 nodes (breadth-first), omits the rest, and appends "... (truncated)"

### Requirement: Hybrid context construction
The system SHALL construct the LLM context as a hybrid of mindmap tree and recent raw conversation:

- If `mindmap.tree` is empty: pass full raw conversation history (legacy behavior)
- If `mindmap.tree` is non-empty: pass serialized mindmap context + last 2 raw messages (1 user + 1 assistant)

The hybrid context SHALL be structured as:
```
<serialized mindmap tree>

## Recent Conversation Context
<last 1-2 raw messages>

## Current Question
<latest user message>
```

#### Scenario: First message uses legacy history
- **WHEN** user sends first message and mindmap is empty
- **THEN** context includes full raw conversation history (empty in this case)

#### Scenario: Subsequent message uses hybrid context
- **WHEN** user sends 5th message and mindmap has 10 nodes
- **THEN** context includes serialized mindmap + last 2 raw messages (messages 3-4) only

#### Scenario: Tree exists but conversation is new
- **WHEN** user creates new conversation while mindmap already has nodes from earlier conversations
- **THEN** context still includes serialized mindmap (cross-conversation knowledge) + empty recent context

### Requirement: Configurable context mode
The system SHALL provide a per-conversation toggle for context mode:
- `auto` (default): Use hybrid strategy based on mindmap.tree state
- `full-history`: Always pass full raw conversation history (legacy behavior)
- `mindmap-only`: Only pass mindmap tree, skip raw history entirely

#### Scenario: Toggle to full-history mode
- **WHEN** user enables `full-history` mode in conversation settings
- **THEN** system ignores mindmap-as-context and passes full conversation history regardless of mindmap state

#### Scenario: Toggle to mindmap-only mode
- **WHEN** user enables `mindmap-only` mode
- **THEN** system passes only the serialized mindmap context with no raw messages
