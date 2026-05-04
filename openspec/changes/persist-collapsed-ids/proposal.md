## Why

`useMindmapLayout` 将节点折叠状态（`collapsedIds`）存储在 React `useState` 中。页面刷新或切换脑图后，用户手动折叠的所有节点全部展开，需重新操作。折叠状态应跟随 MindMap 实体持久化到 IndexedDB。

## What Changes

- `MindMap` 类型新增 `collapsedNodeIds: string[]` 字段
- `mindmapStore` 新增 `setCollapsedNodeIds` action
- `useMindmapLayout` 从 store 读写 `collapsedNodeIds`，替代本地 `useState`

## Capabilities

### New Capabilities
<!-- 无新增能力，属于现有能力的增强 -->

### Modified Capabilities
- `mindmap-data`: MindMap 类型新增 `collapsedNodeIds` 字段，store 新增对应读写 action

## Impact

- 修改 `src/types/mindmap.ts`（MindMap +1 字段）
- 修改 `src/stores/mindmapStore.ts`（+1 action）
- 修改 `src/features/mindmap/useMindmapLayout.ts`（从 store 读写）
- 无破坏性变更：新字段可选，旧数据兼容
