## 1. Remove stale spec directories

- [x] 1.1 删除 `openspec/specs/incremental-mindmap-generation/`
- [x] 1.2 删除 `openspec/specs/mindmap-corpus/`
- [x] 1.3 删除 `openspec/specs/mindmap-content-selection/`
- [x] 1.4 删除 `openspec/specs/mindmap-streaming-preview/`
- [x] 1.5 删除 `openspec/specs/configurable-mindmap-depth/`

## 2. Clean up mindmap-data spec

- [x] 2.1 `mindmap-data` spec 已在 `remove-mindmap-marker` archive 时同步
- [x] 2.2 确认 MindMap/MindMapNode 类型与 `src/types/mindmap.ts` 一致

## 3. Clean up mindmap-generation spec

- [x] 3.1 移除 6 个过时 requirements: Incremental update, Auto-sync, Manual sync, Monitored conversation, Generation model selection, Source tracking
- [x] 3.2 更新 "Generate mindmap" requirement 移除增量/语料库描述，对齐当前全量 JSON mode 行为

## 4. Verify

- [x] 4.1 剩余 12 个 spec 目录，6 个 requirement 对齐代码
