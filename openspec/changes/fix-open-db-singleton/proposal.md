## Why

`src/lib/storage.ts` 和 `src/lib/indexeddb-storage-adapter.ts` 各自独立调用 `openDB('progressive-mindmap', 5)` 打开同一个 IndexedDB 数据库，并分别在 `upgrade` 回调中创建不同的 object store。只有第一次触发的 `upgrade` 会被执行，导致另一个文件期望的 store 可能缺失，造成运行时数据写入失败。

## What Changes

- 新建 `src/lib/db.ts`，提供单例 `getDb()` 函数，统一 database open 和 upgrade 逻辑
- `storage.ts` 和 `indexeddb-storage-adapter.ts` 改为从 `db.ts` 导入 `getDb()`，删除各自的 `openDB` 调用
- upgrade 回调合并：同时创建 `storage.ts` 需要的 4 个 store 和 `indexeddb-storage-adapter.ts` 需要的 `zustand-persist` store
- 行为不变，无破坏性变更

## Capabilities

### New Capabilities
- `indexeddb-singleton`: IndexedDB 数据库连接单例，统一管理与升级逻辑

### Modified Capabilities
<!-- 无现存 requirement 变更 -->

## Impact

- 新建 `src/lib/db.ts`（~30 行）
- 修改 `src/lib/storage.ts`（删除 `openDB` 调用，改用 `getDb()`）
- 修改 `src/lib/indexeddb-storage-adapter.ts`（同上）
- 无依赖变更，无 API 变更，无数据迁移
