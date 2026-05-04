## Context

当前「更新图谱」调用链：

```
buildMindmapPrompt → 旧树 treeToMarkdown → 拼接 prompt → LLM → 新树 → 替换旧树
                                                                    │
                              mergeEditedNodes(newTree, editedNodes)─┘  ← 失效
```

`mergeEditedNodes` 失效原因：新树所有节点用 `generateId()` 生成随机 UUID，旧树的编辑节点 ID 永远匹配不上。

增量生成的目标是反转这个流程：**让模型理解现有树的结构，输出操作指令，客户端精确执行**。

## Goals / Non-Goals

**Goals:**
- 节点 ID 从随机 UUID 变为基于 `label + 路径` 的确定性派生
- 新增增量 prompt：模型输出操作指令（JSON），不再输出完整树
- 客户端操作执行器：解析指令、应用变更、记录操作历史
- 降级路径：增量失败 → 全量再生（保留旧行为）
- 修复 `editedByUser` 保留（自然解决 — 编辑节点的 ID 不再变化）

**Non-Goals:**
- 不实现用户逐条接受/拒绝增量操作（未来迭代）
- 不实现操作 diff 可视化（未来迭代）
- 不改变流式渲染机制
- 不提供分支再生功能（仅全量增量，未来可扩展）

## Decisions

### Decision 1: 节点 ID 派生算法

```typescript
function deriveNodeId(label: string, parentPath: string[]): string {
  const seed = [...parentPath, normalizeLabel(label)].join('/')
  return 'n' + simpleHash(seed).toString(36).slice(0, 7)
}
```

根节点 `parentPath = []`，子节点 `parentPath = [...ancestorLabels]`。

**适用范围**: 仅用于 LLM 生成的节点（`parseMarkdownToTree`、`jsonNodeToMindMapNode`）。用户手动编辑或添加的节点保持原有 ID 不变。这避免了用户重命名节点导致 ID 变化、模型无法通过 ID 找到该节点的问题。

**路径变更时的 ID 变更**: 如果用户把「useState」从「React → 基础 Hooks →」拖到「React → 高级模式 →」，ID 会变。这是预期行为 — 位置变了 = 语义变了。但由于拖拽是用户手动操作，节点保持其当前 ID 不变；只有下次 LLM 重新生成该位置时才会用新路径计算新 ID。

### Decision 2: 增量操作模型

```typescript
type IncrementalOperation =
  | { op: 'add_child', parent_id: string, node: { label: string, summary: string } }
  | { op: 'update', node_id: string, changes: { label?: string, summary?: string } }
  | { op: 'merge', from_id: string, to_id: string }
  | { op: 'delete_leaf', node_id: string }
  | { op: 'noop' }
```

**限制: 不支持 `restructure`（移动节点）**。树结构变更由用户手动操作完成。模型只做增/改/删/合并。理由：LLM 对树结构重组的可靠性低，且容易产生矛盾操作。

### Decision 3: 增量 prompt 结构

系统 prompt 差异：

| 维度 | 全量模式 (旧) | 增量模式 (新) |
|---|---|---|
| 输入旧树 | 完整 Markdown | 完整 Markdown（同全量，保证模型有完整上下文） |
| 输出格式 | Markdown 树或 JSON nodes | JSON 操作列表 |
| 任务描述 | "生成结构化的思维导图" | "分析新旧内容差异，输出图谱修改操作" |

增量 prompt 的核心约束：
- "只输出真正需要的操作，已有内容不要重复生成"
- "如果新内容和旧树完全无关，使用 noop"
- "update 仅当新信息显著丰富了旧概念时才使用"
- "所有 node_id 必须严格匹配旧树中提供的 ID"

### Decision 4: 操作执行器

```typescript
function applyOperations(
  tree: MindMapNode[],
  ops: IncrementalOperation[],
  editedNodeIds: Set<string>
): { newTree: MindMapNode[], changes: ChangeRecord[] }
```

- `add_child`：在树中查找 `parent_id` → 追加到 children
- `update`：查找 `node_id` → 非破坏性修改（保留其他字段）→ **拒绝覆盖 `editedByUser: true` 的节点**
- `merge`：将 `from_id` 的 children 合并到 `to_id` 的 children，删除 `from_id`
- `delete_leaf`：仅叶子节点可删除（有 children 的节点拒绝）
- 无效操作（ID 不存在）→ 静默跳过，日志记录

### Decision 5: 降级策略

三层降级：
1. **增量 prompt + 增量解析成功** → 展示「更新了 N 个节点」
2. **增量 prompt 但解析失败** → 降级到全量 Markdown 再生 → 展示警告 + 恢复全量行为
3. **增量 prompt 但模型不支持**（如 JSON mode 不可用）→ 直接全量 Markdown

## Risks / Trade-offs

- **[风险] 模型输出无效 node_id**: 模型幻觉导致引用不存在的 ID → **缓解**: 客户端静默跳过无效操作，不报错；prompt 强调「节点 ID 精确匹配」
- **[风险] 增量操作累积导致树碎片化**: 多次 add/delete 后结构混乱 → **缓解**: 用户仍可手动编辑调整；未来可加「整理」按钮全量重建
- **[风险] 确定性 ID 碰撞**: 不同概念但相同 label+路径 → 碰撞概率极低（8 字符 base36 = 3e12 空间），且同一路径下 label 相同 = 确实是同一概念
- **[权衡] 放弃 restructure 操作**: 复杂结构调整需要用户手动操作 → 首版本接受，未来可加 `suggest_restructure` 作为建议操作
