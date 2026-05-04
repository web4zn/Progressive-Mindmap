## Context

`useMindmapLayout`（37 行）管理折叠状态，当前用 `useState<Set<string>>(new Set())`，每次挂载重置为空。`MindMap` 实体已通过 Zustand persist 持久化到 IndexedDB，折叠状态应跟随 MindMap 持久化。

## Goals / Non-Goals

**Goals:**
- 折叠状态随 MindMap 持久化到 IndexedDB
- 刷新/切换脑图后折叠状态恢复

**Non-Goals:**
- 不改变 MindMap 的 IndexedDB 存储方式（Zustand persist）
- 不改变 `useMindmapLayout` 的对外接口

## Decisions

### D1: 新增 `MindMap.collapsedNodeIds: string[]`

字段类型选 `string[]` 而非 `Set<string>` 因为 Zustand persist 序列化到 IndexedDB 时 `Set` 会丢失。在 hook 内部转换。

```typescript
// src/types/mindmap.ts
export interface MindMap {
  // ... existing fields
  collapsedNodeIds?: string[]
}
```

### D2: Store 新增 `setCollapsedNodeIds` action

```typescript
// src/stores/mindmapStore.ts
setCollapsedNodeIds: (id: string, nodeIds: string[]) => void
```

操作当前 active mindmap 或指定 mindmapId 的折叠状态。

### D3: `useMindmapLayout` 从 store 读写

```typescript
// useMindmapLayout.ts — 改为
const collapsedIds = useMemo(
  () => new Set(activeMindmap?.collapsedNodeIds ?? []),
  [activeMindmap?.collapsedNodeIds]
)

const toggleCollapse = useCallback((id: string) => {
  const next = new Set(collapsedIds)
  next.has(id) ? next.delete(id) : next.add(id)
  setCollapsedNodeIds(activeMindmapId, [...next])
}, [collapsedIds, activeMindmapId])
```

## Risks / Trade-offs

- **[多脑图场景]**: `collapsedNodeIds` 在 `useMindmapLayout` 调用侧通过 props 传入 `activeMindmapId`，确保不同脑图互不干扰。
- **[初始化]**: 旧 MindMap 没有 `collapsedNodeIds` → `?? []` → 空集合 → 全部展开。渐进兼容。
