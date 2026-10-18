## MODIFIED Requirements

### Requirement: Agent outputs incremental operations instead of full tree

The Agent SHALL produce a list of `MindmapOperation` objects rather than a complete tree replacement. Each operation SHALL carry its payload fields directly on the operation object — there SHALL NOT be a nested `patch` object.

#### Scenario: Agent generates add_child operation
- **WHEN** the Agent identifies a new concept in the conversation that should be added under an existing parent node
- **THEN** it produces an operation `{ type: 'add_child', parentId: string, label: string, summary?: string }`
- **AND** the operation specifies the target parent node ID, the new node's label and optional summary

#### Scenario: Agent generates update operation
- **WHEN** the Agent determines an existing node's label, summary, or content should be refined with new information
- **THEN** it produces an operation `{ type: 'update', nodeId: string, label?: string, summary?: string, content?: string, contentType?: 'text' | 'html' }`
- **AND** the operation includes the node ID and only the fields to be updated, with no `patch` wrapper
- **AND** when `content` is supplied with `contentType: 'html'`, the content is stored as HTML

#### Scenario: Agent generates delete_leaf operation
- **WHEN** the Agent determines a leaf node (no children) is no longer relevant
- **THEN** it produces an operation `{ type: 'delete_leaf', nodeId: string }`

#### Scenario: Agent generates add_root operation
- **WHEN** the mindmap is empty and a new root concept is identified
- **THEN** it produces an operation `{ type: 'add_root', label: string, summary?: string }`

### Requirement: Operations are validated before application

系统 SHALL 在应用操作之前执行两层校验：先用 Zod schema（`OperationsArraySchema.safeParse`）校验每批 `generateMindmapOps` 参数，单批操作数 SHALL NOT 超过 20，批次中任一操作校验失败时系统 SHALL 拒绝整批操作（不应用其中任何一条）并把校验错误作为工具结果回灌给 Agent；通过 schema 校验后，`applyOperations` SHALL 在应用每条操作时再次检查目标节点存在性、`delete_leaf` 的目标是否为叶子、以及 `editedByUser` 保护。

#### Scenario: Batch larger than 20 operations is rejected
- **WHEN** Agent 在一次 `generateMindmapOps` 调用中提交 21 个操作
- **THEN** Zod 校验失败，错误文本为“每次最多 20 个操作，请拆分为多次调用”
- **AND** 该批次没有任何操作被应用

#### Scenario: Malformed operation rejects the whole batch
- **WHEN** 批次中任一操作缺少 `type`，或使用了未知的 `type`（例如已移除的 `merge`）
- **THEN** 整批操作被拒绝，`applyOperations` 不被调用
- **AND** 工具结果返回 `success: false` 与校验错误文本

#### Scenario: Validation error is fed back to the Agent
- **WHEN** `generateMindmapOps` 因校验失败返回错误
- **THEN** 该工具结果作为消息追加到 Agent 的 ReAct 循环上下文中
- **AND** Agent 可在后续步骤修正操作后重试

#### Scenario: Valid batch is applied
- **WHEN** 批次中全部操作通过 Zod 校验
- **THEN** 校验后的操作依次经 `applyOperations` 应用到当前树
- **AND** 工具结果返回 `success: true`、更新后的节点数与已应用的操作列表

#### Scenario: Invalid parentId is handled gracefully
- **WHEN** an `add_child` operation references a `parentId` that does not exist in the current tree
- **THEN** the operation is skipped with a warning logged to console

#### Scenario: Update to non-existent nodeId is handled
- **WHEN** an `update` operation references a `nodeId` that does not exist
- **THEN** the operation is skipped with a warning logged

#### Scenario: Delete on node with children is rejected
- **WHEN** a `delete_leaf` operation targets a node that has children
- **THEN** the operation is rejected with a warning (safety check)

## REMOVED Requirements

### Requirement: Incremental prompt replaces full-generation prompt

*（已移除）*

#### Scenario: Incremental prompt instructs LLM to output operations
- **WHEN** `buildIncrementalPrompt` is called
- **THEN** the prompt instructs the LLM to output JSON with an `operations` array
- **AND** each operation type (add_child, update, delete_leaf, add_root) is documented with examples
- **AND** pattern-specific organization rules (5w1h, tech, pros-cons) are still included when a pattern is specified

#### Scenario: LLM is told to reference real node IDs
- **WHEN** the LLM receives the incremental prompt along with the flat tree context
- **THEN** the prompt explicitly states that parentId/nodeId must use IDs from the flat tree
- **AND** warns against fabricating IDs
