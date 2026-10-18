## ADDED Requirements

### Requirement: Reparent operation

The system SHALL accept `{ type: 'reparent', nodeId: string, newParentId: string }`
as a valid mindmap operation, both in the Zod operation schema and in
`applyOperations`.

A reparent operation SHALL move the target node (with its whole subtree) under
`newParentId`, and SHALL be rejected (operation skipped, tree unchanged) when:

- `nodeId` and `newParentId` are the same node,
- `newParentId` is a descendant of `nodeId`,
- the target node or the new parent has `editedByUser: true`,
- either node does not exist.

#### Scenario: Move a node under a new parent

- **WHEN** the Agent proposes `{ type: 'reparent', nodeId: 'traits', newParentId: 'go' }`
- **THEN** `traits` (and its subtree) is removed from its old parent and appended to `go`
- **AND** the operation passes Zod validation unchanged (no field stripping)

#### Scenario: Reparent to self is rejected

- **WHEN** the Agent proposes a reparent whose `newParentId === nodeId`
- **THEN** the operation is skipped and the tree is unchanged

#### Scenario: Reparent into own subtree is rejected

- **WHEN** the Agent proposes moving a node under one of its descendants
- **THEN** the operation is skipped and the tree is unchanged

#### Scenario: Reparent of a user-edited branch is rejected

- **WHEN** the target node or the new parent has `editedByUser: true`
- **THEN** the operation is skipped and the user's edit is preserved

### Requirement: Operations are confined to the run scope

When a run carries a `scopeNodeId`, only that node's subtree SHALL be visible to
the Agent's read tools and only that subtree SHALL receive operations.

If the scope node cannot be found in the current tree, the system SHALL abort
the batch instead of falling back to full-tree application.

If an operation removes the scope node itself (e.g. `delete_leaf` on the scope
root), the node SHALL be removed from the full tree; the system SHALL NOT persist
an `undefined` node.

#### Scenario: Out-of-scope target is skipped

- **WHEN** a scoped run proposes an operation whose target node lives outside the scope subtree
- **THEN** the operation is skipped and the tree outside the scope is unchanged

#### Scenario: Missing scope node aborts the batch

- **WHEN** the run's `scopeNodeId` is not present in the current tree
- **THEN** no operations are applied
- **AND** the tool result reports an error instead of a successful node count

#### Scenario: Deleting the scope root

- **WHEN** a scoped run deletes the scope node (a leaf)
- **THEN** the scope node is removed from the full tree
- **AND** every remaining node is a valid `MindMapNode`
