## Why

当前「更新图谱」实际执行的是全量再生：将旧树转成 Markdown 塞进 prompt，LLM 重新输出完整树，客户端再把用户编辑的节点硬合并回去。这导致三个问题：

1. **越更新越退化**：每次重生的输出质量不可控，prompt 变长后质量可能下降
2. **用户编辑实际丢失**：`mergeEditedNodes` 靠节点 ID 匹配，但每次生成都给节点换新 ID（`generateId()`），旧编辑的 ID 和新树的 ID 永远不会匹配 — 编辑保留功能是失效的
3. **无法局部更新**：新增一条消息就要重跑整个 100 节点的树，浪费 token 和时间

需要将生成模式从「全量替换」切换到「增量操作」，让模型对现有树输出修改指令而非重建整棵树。

## What Changes

- **节点 ID 稳定化**：LLM 生成的节点使用基于 `label + 路径` 的确定性派生 ID，使同一概念在多次生成中保持同一 identity。用户手动编辑或添加的节点保持其原有 ID 不变。
- **新增增量生成 prompt**：模型接收完整树 Markdown（含 node_id）+ 语料内容，输出 JSON 操作列表（add_child、update、merge、noop），而非完整 Markdown 树。
- **新增操作执行器**：客户端解析操作指令并应用到现有树，支持预览、撤销。
- **降级机制**：增量操作解析失败时自动降级为全量再生（保留旧行为作为 fallback）。
- **`editedByUser` 保留修复**：节点 ID 稳定化自然解决编辑保留失效问题。
- **已编辑节点不可被模型覆盖**：操作执行器拒绝覆盖 `editedByUser: true` 的节点。**BREAKING**: 生成行为变更 — 用户编辑后节点不再参与自动生成。

## Capabilities

### New Capabilities
- `incremental-mindmap-generation`: 增量生成能力 — 模型输出操作指令，客户端增量应用到现有树

### Modified Capabilities
- `mindmap-data`: MindMapNode 的 `id` 生成策略从随机 UUID 变为确定性派生
- `mindmap-generation`: 新增增量生成 prompt 和操作执行器，保留全量再生作为降级路径
- `mindmap-node-editing`: `editedByUser` 节点受操作执行器保护，不被增量操作覆盖

## Impact

- **ID 系统**: `src/lib/id.ts` 新增 `deriveNodeId` 函数；`parseMarkdownToTree`、`jsonNodeToMindMapNode` 使用确定性 ID
- **生成逻辑**: `src/lib/mindmap-generator.ts` 新增 `buildIncrementalPrompt`、`parseOperations`、`applyOperations`；`generateMindmap` 新增增量模式
- **状态管理**: `src/stores/mindmapStore.ts` 可能需要支持 undo stack（操作记录）
- **UI**: `MindMapPanel.tsx` 展示增量变更 diff、逐条接受/拒绝（未来迭代）
- **测试**: 需要重写部分测试 — ID 不再随机，`editedByUser` 保留行为变更
