## Purpose

Describe how the Agent obtains and uses memory: reading the current mindmap as reasoning context, generating mindmap operations from conversation material with a dedicated LLM, and reserving a memory system for phase 2.

## Requirements

### Requirement: Agent can read current mindmap as context

The Agent SHALL be able to read the current mindmap tree structure as context for its reasoning.

#### Scenario: Agent reads mindmap before generating operations
- **WHEN** the Agent Worker's reasoning loop determines it needs to read the mindmap
- **THEN** it sends a `TOOL_RESULT_NEEDED` for the `readMindmap` tool
- **AND** the main thread returns the serialized mindmap tree context via `mindmapTreeToContext()`
- **AND** the returned context includes node labels, summaries, and the `[用户编辑]` marker for edited nodes

### Requirement: Agent can generate mindmap from conversation materials

The Agent SHALL be able to generate or update a mindmap by calling a dedicated LLM (separate from the chat LLM).

#### Scenario: Agent generates mindmap operations from conversation
- **WHEN** the Agent Worker determines it has gathered sufficient context
- **THEN** it requests `generateMindmapOps` tool execution via round-trip
- **AND** the main thread calls `chat()` with a system prompt containing `buildFullMindmapPrompt()` + conversation materials + existing tree context
- **AND** the LLM returns mindmap JSON
- **AND** the main thread parses, merges with edited nodes, and updates the store
- **AND** the tool result reports success/failure back to the Worker

### Requirement: Memory system (phase 2, foundation)

[Phase 2 scope — reserved for future implementation] The memory system SHALL remain a phase 2 deliverable and SHALL NOT be implemented as part of the current capability.

#### Scenario: Memory system is reserved for phase 2
- **WHEN** the Agent runs in the current phase
- **THEN** no memory subsystem is required or provided
- **AND** this requirement remains reserved for future implementation
