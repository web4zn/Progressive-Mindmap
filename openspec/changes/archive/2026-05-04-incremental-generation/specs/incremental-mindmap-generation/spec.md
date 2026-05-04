## ADDED Requirements

### Requirement: Deterministic node ID generation
系统 SHALL 使用基于节点 label 和父路径的确定性算法生成节点 ID，替代随机 UUID。算法 SHALL 保证：相同 label + 相同路径 → 相同 ID。这确保同一概念在多次生成中保持 identity 稳定。

#### Scenario: Same concept generates same ID
- **WHEN** 两次生成都在路径「React →」下产生 label 为「useState」的节点
- **THEN** 两次生成中该节点的 ID 相同

#### Scenario: Same label in different paths generates different IDs
- **WHEN** 「useState」分别出现在「React → 基础」和「Vue → 基础」两条路径下
- **THEN** 两个节点的 ID 不同

#### Scenario: ID migration for existing trees
- **WHEN** 旧图谱（节点使用随机 UUID）首次触发增量生成
- **THEN** 系统将旧节点的 ID 迁移为确定性 ID，`editedByUser` 标记保留

### Requirement: Incremental generation prompt
系统 SHALL 在已有树结构时使用增量 prompt 替代全量 prompt。增量 prompt SHALL 将现有树的完整 Markdown 表示（含 node_id）和语料内容一起发送给 LLM，SHALL 要求模型输出 JSON 操作列表而非完整树。

增量 prompt 的输出格式 SHALL 为：
```json
{
  "analysis": "新内容主要补充了useEffect的清理机制细节...",
  "operations": [
    { "op": "add_child", "parent_id": "n3", "node": { "label": "useEffect", "summary": "处理副作用的核心Hook" } },
    { "op": "update", "node_id": "n7", "changes": { "summary": "新认知: 闭包陷阱的根因是..." } },
    { "op": "merge", "from_id": "n12", "to_id": "n5" },
    { "op": "noop" }
  ]
}
```

#### Scenario: Incremental generation adds new node
- **WHEN** 现有树包含「React → useState」，新对话讨论了 useEffect，用户触发更新
- **THEN** 模型输出 `add_child` 操作将 useEffect 添加到 React 下

#### Scenario: Incremental generation updates existing node
- **WHEN** 新对话补充了 useState 闭包陷阱的深入解释
- **THEN** 模型输出 `update` 操作修改 useState 节点的 summary

#### Scenario: Incremental generation detects redundant concepts
- **WHEN** 现有树中两个节点实际是同一概念的不同表述
- **THEN** 模型输出 `merge` 操作合并两个节点

#### Scenario: No meaningful new content
- **WHEN** 新对话内容与现有树完全无关或没有实质补充
- **THEN** 模型输出 `{"operations": [{"op": "noop"}]}`，树保持不变

### Requirement: Operation executor
系统 SHALL 提供操作执行器，将模型输出的操作指令应用到现有树。执行器 SHALL：

- `add_child`：查找 parent_id 节点，追加新节点到其 children 末尾
- `update`：查找 node_id 节点，合并非破坏性修改（仅更新指定的 label 或 summary）
- `merge`：将 from_id 的 children 合并到 to_id，从 from_id 的父节点 children 中移除
- `delete_leaf`：删除叶子节点，有 children 的节点拒绝删除
- 无效 node_id：静默跳过，记录日志
- `editedByUser: true` 的节点 SHALL 被操作执行器保护，拒绝 update/merge/delete

#### Scenario: Operation applied successfully
- **WHEN** 模型输出 3 个有效操作
- **THEN** 树结构精确反映所有操作，变更记录为 3

#### Scenario: Invalid node_id skipped
- **WHEN** 模型输出的操作引用不存在的 node_id
- **THEN** 该操作被静默跳过，不影响其他操作，日志记录警告

#### Scenario: Protected node not overwritten
- **WHEN** 模型输出 `update` 操作修改 `editedByUser: true` 的节点
- **THEN** 操作被拒绝，节点保持编辑后的内容

### Requirement: Incremental generation fallback
增量生成解析失败时，系统 SHALL 自动降级为全量 Markdown 再生。降级时 SHALL 在界面显示提示：「增量生成失败，已使用全量模式」。

#### Scenario: Incremental parse failure falls back to full regeneration
- **WHEN** 模型返回的 JSON 不包含有效 operations 数组，或 JSON 解析失败
- **THEN** 系统降级使用全量 Markdown 解析，旧树被替换

### Requirement: First-time vs incremental mode selection
系统 SHALL 根据图谱状态选择生成模式：
- 树为空（首次生成）→ 全量模式
- 树非空 → 增量模式
- 用户可在设置中强制选择「全量重建」

#### Scenario: First generation uses full mode
- **WHEN** 图谱 tree 为空，用户触发生成
- **THEN** 系统使用全量 prompt

#### Scenario: Subsequent generation uses incremental mode
- **WHEN** 图谱 tree 已包含节点，用户触发生成
- **THEN** 系统默认使用增量 prompt
