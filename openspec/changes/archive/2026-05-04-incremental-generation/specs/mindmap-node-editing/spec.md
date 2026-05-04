## MODIFIED Requirements

### Requirement: Edited node preservation during sync
系统 SHALL 在同步时保护用户编辑过的节点。`editedByUser: true` 的节点 SHALL 被操作执行器保护：拒绝 `update`、`merge`、`delete` 操作。节点 ID 稳定化（确定性派生）后，编辑节点的 ID 在多次生成中保持不变，编辑保留自然生效。

#### Scenario: Incremental sync preserves user edits
- **WHEN** 用户编辑了节点 A 的 label（`editedByUser: true`），随后增量同步触发，模型尝试更新节点 A
- **THEN** 操作执行器拒绝覆盖，节点 A 保留用户编辑的内容

#### Scenario: User can still manually delete edited node
- **WHEN** 用户通过右键菜单删除自己编辑过的节点
- **THEN** 节点正常删除（手动操作不受执行器保护限制）

#### Scenario: Manual sync offers overwrite option
- **WHEN** 用户点击「全量重建」，存在 `editedByUser: true` 的节点
- **THEN** 系统弹出提示：「存在手动编辑的节点，是否用 AI 生成内容覆盖？」用户可选择「覆盖」或「保留」
