## Context

当前 `src/lib/mindmap-generator.ts` 中有三处硬编码的截断：

```
parseJsonToTree(jsonString, maxDepth = 6)     → 调用方不传参, 固定 6
parseMarkdownToTree(markdown, maxDepth = 6)   → 同上, 深度超限时 child 不入 stack
jsonNodeToMindMapNode(item, depth, maxDepth)  → depth >= maxDepth 时 children = []
jsonNodeToMindMapNode 内: children.slice(0, 10) → 每节点最多 10 个子节点
```

LLM 在 prompt 中没有深度/子节点上限的约束，生成完以后解析阶段却丢弃了数据。调用方 `ChatPage.tsx` 两处 `parseJsonToTree(...)` 都不传 `maxDepth`。

## Goals / Non-Goals

**Goals:**
- LLM 生成的任意深度的树都能完整解析
- LLM 生成的任意子节点数的节点都完整保留
- 调用方无需改动

**Non-Goals:**
- 不引入 `maxDepth` 可配置 UI（那是另一个 change）
- 不改变 prompt 内容
- 不改 `mindmapTreeToContext` 的 `maxNodes=200`（那是 prompt 序列化截断，非树结构截断）

## Decisions

### Decision 1: `maxDepth` → `Infinity`，而非移除参数

保留参数签名（向下兼容），默认值从 `6` 改为 `Infinity`。

**备选**: 直接移除参数 → 改为无参数函数 → 调用方需改动测试文件 → 选保留签名更安全。

### Decision 2: 移除 `children.slice(0, 10)`

直接删除 `.slice(0, 10)`，不对子节点数组做任何截断。

### Decision 3: Markdown 解析正则 `^(#{1,6})\\s` → `^(#+)\\s`

当前 `new RegExp('^(#{1,' + maxDepth + '})\\s+(.+)')` 在 `maxDepth=Infinity` 下产生 `^(#{1,Infinity})\\s+(.+)` —— 这在 JS 中是合法语法，等同 `^(#+)\\s+(.+)`。无需特殊处理。

### Decision 4: `parseMarkdownToTree` 的 depth boundary

当前 L108: `if (depth < maxDepth) { stack.push(...) }`。`depth < Infinity` → 始终为 true。所有层级都会被 push 到 stack，无截断。

## Risks / Trade-offs

- [内存/性能] LLM 返回深度极大的树（如 100 层）或单节点有 200 个子节点时，React Flow 渲染可能变慢 → Mitigation: 已有 `mindmapTreeToContext` 的 `maxNodes=200` 作为 prompt 上下文截断保护；LLM 实际生成超大树的概率极低 (当前 prompt 无深度指令时 LLM 通常产出 3-5 层)
- [已废弃的 spec] `configurable-mindmap-depth` 和 `mindmap-generation` 中的 `maxDepth` 相关 requirement 与当前修改不一致 → Mitigation: 后续独立 change 更新或清理这些 spec
