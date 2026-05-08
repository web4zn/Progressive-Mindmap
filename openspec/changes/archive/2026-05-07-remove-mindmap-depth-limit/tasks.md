## 1. Core changes

- [x] 1.1 `parseJsonToTree`: 默认值 `maxDepth = 6` → `maxDepth = Infinity`
- [x] 1.2 `jsonNodeToMindMapNode`: 默认值 `maxDepth = 6` → `maxDepth = Infinity`
- [x] 1.3 `jsonNodeToMindMapNode` L140: 移除 `children.slice(0, 10)` 改为 `children`
- [x] 1.4 `jsonNodeToMindMapNode` L151: `depth < (maxDepth ?? 6)` → `depth < maxDepth` (去掉多余 `??`)
- [x] 1.5 `parseMarkdownToTree` 已由 `remove-mindmap-marker` 整体删除

> 注：任务 1.1-1.4 的代码改动已在 `remove-mindmap-marker` 实施时一并完成。

## 2. Tests

- [x] 2.1 新增测试：深度超过 6 层（8 层）的 JSON 完整解析
- [x] 2.2 新增测试：单节点 15 个子节点全部保留
- [x] 2.3 确认现有测试全部通过 (`npm test` — 69 passed)
- [x] 2.4 检查 `npm run lint` 通过 (0 errors)

## 3. Deferred to follow-up changes

- [x] 3.1 `parseMarkdownToTree` 已随 `remove-mindmap-marker` 删除
- [x] 3.2 旧 spec 清理 → `cleanup-stale-specs`
