## 1. 节点 ID 稳定化

- [x] 1.1 `src/lib/id.ts` 新增 `deriveNodeId(label, parentPath)` 函数，使用确定性哈希算法
- [x] 1.2 `parseMarkdownToTree` 使用 `deriveNodeId` 替代 `generateId()`，传入当前解析路径（仅用于 LLM 生成的新节点）
- [x] 1.3 `jsonNodeToMindMapNode` 使用 `deriveNodeId` 替代 `generateId()`（仅用于 LLM 生成的新节点）
- [x] 1.4 单元测试：`deriveNodeId` 的确定性（同 label + 同路径 → 同 ID）、区分性（不同路径 → 不同 ID）

## 2. 增量操作类型定义

- [x] 2.1 `src/types/mindmap.ts` 新增 `IncrementalOperation` 联合类型（`add_child` / `update` / `merge` / `delete_leaf` / `noop`）
- [x] 2.2 `src/types/mindmap.ts` 新增 `IncrementalResult` 类型（`{ analysis: string, operations: IncrementalOperation[] }`）
- [x] 2.3 `src/types/mindmap.ts` 新增 `ChangeRecord` 类型（操作执行日志，用于 undo/日志）
- [x] 2.4 `src/types/index.ts` 确保导出新增类型

## 3. 增量 prompt 构建

- [x] 3.1 `src/lib/mindmap-generator.ts` 新增 `buildIncrementalPrompt(existingTree, conversations, materialContent?)` 函数
- [x] 3.2 增量 system prompt：角色定义（知识图谱增量编辑助手）、输出格式（JSON operations）、约束（只输出必要操作、ID 精确匹配、不覆盖编辑节点）
- [x] 3.3 旧树信息：将现有树转为 Markdown（复用 `treeToMarkdown`），与语料内容一起传入 prompt
- [x] 3.4 `generateMindmap` 函数新增 `mode: 'full' | 'incremental'` 参数，根据模式选择 prompt 构建策略

## 4. 操作执行器

- [x] 4.1 `src/lib/mindmap-generator.ts` 新增 `parseOperations(jsonString)` 函数：解析 LLM 返回的 JSON → `IncrementalOperation[]`
- [x] 4.2 `src/lib/mindmap-generator.ts` 新增 `applyOperations(tree, ops, editedNodeIds)` 函数：
  - `add_child`: 查找 parent_id → 追加节点到 children
  - `update`: 查找 node_id → 合并 changes（仅 label/summary）→ 拒绝 `editedByUser: true` 节点
  - `merge`: 合并 children → 删除 from_id 节点
  - `delete_leaf`: 仅叶子节点可删除
  - `noop`: 跳过
  - 无效 node_id: 跳过 + 日志
- [x] 4.3 `src/lib/mindmap-generator.ts` 新增 `buildEditedNodeIdSet(tree)` 函数：收集所有 `editedByUser: true` 的节点 ID
- [x] 4.4 单元测试：`parseOperations` 正常解析、异常输入降级；`applyOperations` 各操作类型的正确性和保护逻辑

## 5. 生成模式选择与降级

- [x] 5.1 `MindMapPanel.tsx` `handleGenerate` 中根据 `activeMindmap.tree.length > 0` 自动选择增量模式
- [x] 5.2 增量路径：调用 `generateMindmap` with `mode: 'incremental'` → 收集流式输出 → `parseOperations` → `applyOperations`
- [x] 5.3 降级逻辑：如果 `parseOperations` 失败（无有效 operations 数组）→ 降级到全量 Markdown 再生 → 展示 toast 提示
- [x] 5.4 图谱设置增加「强制全量重建」选项，允许用户覆盖自动模式选择
- [x] 5.5 首次生成（tree 为空）强制使用全量模式

## 6. 验证

- [x] 6.1 端到端：首次生成 → 全量模式；再次生成 → 增量模式，验证只有变化的部分被操作
- [x] 6.2 增量操作失败降级：mock LLM 返回无效 JSON → 验证降级到全量模式
- [x] 6.3 编辑保护：编辑节点后增量生成 → 验证编辑内容未被覆盖
- [x] 6.4 ID 稳定性：两次增量生成后，相同概念的节点 ID 不变
- [x] 6.5 所有现有测试继续通过（ID 变更可能影响部分测试断言，需要更新）
