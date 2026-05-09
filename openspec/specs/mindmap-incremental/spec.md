## ADDED Requirements

### Requirement: Agent outputs incremental operations instead of full tree

The Agent SHALL produce a list of `MindmapOperation` objects rather than a complete tree replacement.

#### Scenario: Agent generates add_child operation
- **WHEN** the Agent identifies a new concept in the conversation that should be added under an existing parent node
- **THEN** it produces an operation `{ type: 'add_child', parentId: string, label: string, summary?: string }`
- **AND** the operation specifies the target parent node ID, the new node's label and optional summary

#### Scenario: Agent generates update operation
- **WHEN** the Agent determines an existing node's label or summary should be refined with new information
- **THEN** it produces an operation `{ type: 'update', nodeId: string, patch: { label?: string, summary?: string } }`
- **AND** the operation includes the node ID and the fields to update

#### Scenario: Agent generates delete_leaf operation
- **WHEN** the Agent determines a leaf node (no children) is no longer relevant
- **THEN** it produces an operation `{ type: 'delete_leaf', nodeId: string }`

#### Scenario: Agent generates add_root operation
- **WHEN** the mindmap is empty and a new root concept is identified
- **THEN** it produces an operation `{ type: 'add_root', label: string, summary?: string }`

### Requirement: Incremental operations respect editedByUser protection

The system SHALL NOT apply operations to nodes that have been edited by the user (`editedByUser === true`).

#### Scenario: Update operation skips user-edited node
- **WHEN** the Agent produces an `update` operation for a node that has `editedByUser: true`
- **THEN** the operation is silently skipped
- **AND** the user's edit is preserved unchanged

#### Scenario: Delete_leaf operation skips user-edited node
- **WHEN** the Agent produces a `delete_leaf` operation for a node that has `editedByUser: true`
- **THEN** the operation is silently skipped
- **AND** the node remains in the mindmap

#### Scenario: Add_child under user-edited parent respects parent structure
- **WHEN** the Agent produces an `add_child` operation targeting a parent node with `editedByUser: true`
- **THEN** the operation is silently skipped (children cannot be added under user-edited nodes)
- **AND** the parent node is preserved unchanged

### Requirement: Operations are validated before application

The system SHALL validate each operation before applying it to the mindmap tree.

#### Scenario: Invalid parentId is handled gracefully
- **WHEN** an `add_child` operation references a `parentId` that does not exist in the current tree
- **THEN** the operation is skipped with a warning logged to console

#### Scenario: Update to non-existent nodeId is handled
- **WHEN** an `update` operation references a `nodeId` that does not exist
- **THEN** the operation is skipped with a warning logged

#### Scenario: Delete on node with children is rejected
- **WHEN** a `delete_leaf` operation targets a node that has children
- **THEN** the operation is rejected with a warning (safety check)

### Requirement: Tree context provides node IDs for LLM reference

The system SHALL provide the current mindmap tree to the LLM in a format that includes each node's unique ID and its editedByUser status.

#### Scenario: Flat tree context includes node IDs
- **WHEN** `mindmapTreeToFlatContext` is called with a non-empty tree
- **THEN** each node line includes `[id: <hash>]` followed by label, summary, and optional `[用户编辑]` marker
- **AND** indentation reflects hierarchy
- **AND** output is truncated at maxNodes (default 200)

### Requirement: Incremental prompt replaces full-generation prompt

The system SHALL use `buildIncrementalPrompt` instead of `buildFullMindmapPrompt` for mindmap operations.

#### Scenario: Incremental prompt instructs LLM to output operations
- **WHEN** `buildIncrementalPrompt` is called
- **THEN** the prompt instructs the LLM to output JSON with an `operations` array
- **AND** each operation type (add_child, update, delete_leaf, add_root) is documented with examples
- **AND** pattern-specific organization rules (5w1h, tech, pros-cons) are still included when a pattern is specified

#### Scenario: LLM is told to reference real node IDs
- **WHEN** the LLM receives the incremental prompt along with the flat tree context
- **THEN** the prompt explicitly states that parentId/nodeId must use IDs from the flat tree
- **AND** warns against fabricating IDs
