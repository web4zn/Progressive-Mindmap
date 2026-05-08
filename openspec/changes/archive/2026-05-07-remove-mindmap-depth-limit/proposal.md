## Why

`parseJsonToTree` / `parseMarkdownToTree` / `jsonNodeToMindMapNode` 对 LLM 生成的脑图施加了硬编码深度上限（`maxDepth=6`，调用方不传参）和每节点子节点数上限（`children.slice(0,10)`）。LLM 生成时不设限制，但解析阶段一刀切截断，导致第 7 层及更深节点的子节点数据被丢弃，超过 10 个子节点的分支被静默截断。

## What Changes

- 移除 `parseJsonToTree` / `parseMarkdownToTree` / `jsonNodeToMindMapNode` 中的 `maxDepth` 默认上限（改为 `Infinity` 或不截断）
- 移除 `jsonNodeToMindMapNode` 中的 `children.slice(0, 10)` 子节点数量硬限制
- 保留 `mindmapTreeToContext` 中的 `maxNodes=200`（这是 prompt 上下文序列化截断，不是树结构截断）
- **BREAKING**: 无。只是移除了数据丢弃逻辑，已持久化的旧树不受影响

## Capabilities

### Modified Capabilities
- `mindmap-generation`: 解析器不再对 LLM 输出施加深度和子节点数量上限

## Impact

- `src/lib/mindmap-generator.ts`: `parseJsonToTree`, `parseMarkdownToTree`, `jsonNodeToMindMapNode`
- 调用方无需改动（已经不传 `maxDepth` 参数，将自动使用移除上限后的行为）
- 测试文件需更新：`src/lib/__tests__/mindmap-generator.test.ts`
