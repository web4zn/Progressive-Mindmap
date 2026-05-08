## Why

`openspec/specs/` 中存在多个 spec 文件，描述的功能与当前实际代码行为严重不符。这些 spec 是多次迭代中 abandoned 的产物，保留它们会导致后续开发人员按这些 spec 实现不存在或已废弃的功能。

## What Changes

- 删除以下整目录 spec（功能从未实现或已废弃）：
  - `incremental-mindmap-generation` — 增量操作（`add_child`, `merge`, `delete_leaf`）未实现
  - `mindmap-corpus` — 语料库系统未实现
  - `mindmap-content-selection` — 文本片段选择未实现
  - `mindmap-streaming-preview` — 流式预览未实现
  - `configurable-mindmap-depth` — 可配置深度已被 `remove-mindmap-depth-limit` 替代（改为不设上限）
- 清理以下 spec 中与实际代码不符的 requirements：
  - `mindmap-data` — 移除 `maxDepth`, `corpus`, `forceFullRebuild`, `generatorProviderId`, `generatorModelId`, `lastGeneratedAt` 字段；移除 source tracking scenario
  - `mindmap-generation` — 移除 incremental、auto-sync、manual sync、corpus、source tracking 相关 requirements（被 `remove-mindmap-depth-limit` chang 覆盖的 depth/breadth 部分不动）

## Capabilities

### Modified Capabilities
- `mindmap-data`: 类型定义与实际 MindMap/MindMapNode 接口对齐
- `mindmap-generation`: 移除未实现的增量/自动同步/语料库/溯源 requirements

### Removed Capabilities
- `incremental-mindmap-generation`
- `mindmap-corpus`
- `mindmap-content-selection`
- `mindmap-streaming-preview`
- `configurable-mindmap-depth`

## Impact

- 仅影响 `openspec/specs/` 目录，不影响 `src/` 代码
