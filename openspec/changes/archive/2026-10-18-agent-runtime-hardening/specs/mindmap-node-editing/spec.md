## ADDED Requirements

### Requirement: Move up / move down direction

The node context menu SHALL move a node within its sibling order:

- 上移 SHALL swap the node with its previous sibling (index − 1),
- 下移 SHALL swap the node with its next sibling (index + 1).

The corresponding menu items SHALL be disabled when the node is already first /
last among its siblings. The operation SHALL be recorded in the undo timeline.

#### Scenario: Move a middle node up

- **WHEN** a node is the second of three siblings and the user clicks 上移
- **THEN** it swaps with the first sibling and becomes first
- **AND** the move can be undone

#### Scenario: Move a middle node down

- **WHEN** a node is the second of three siblings and the user clicks 下移
- **THEN** it swaps with the third sibling and becomes last

#### Scenario: Disable at the edges

- **WHEN** a node is the first (or last) among its siblings
- **THEN** 上移 (or 下移) is disabled
