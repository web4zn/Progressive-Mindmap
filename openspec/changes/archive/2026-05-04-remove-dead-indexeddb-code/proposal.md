## Why

`src/lib/storage.ts` 共 288 行，提供 IndexedDB 逐条 CRUD、`LocalStorageFallback`、`StorageImpl` 接口等功能。经全量引用检查，**该文件未被子任何模块导入或使用**——Zustand store 全部通过 `indexeddb-storage-adapter.ts` 统一走 Zustand persist 中间件进行持久化。该文件属于 Iteration 1 的遗留死代码，增加维护负担且造成"双 openDB"假象。

同时，`indexeddb-storage-adapter.ts` 当前对 IndexedDB 失败无任何错误处理——隐私模式等场景下直接静默失败，用户看到空白页面。

## What Changes

- **删除** `src/lib/storage.ts`（BREAKING: 删除所有 export，但确认零外部引用）
- **修改** `src/lib/indexeddb-storage-adapter.ts`：在 `createIndexedDBStorage()` 中增加 IndexedDB 初始化失败的异常捕获，失败时抛出明确错误信息，让 Zustand persist 使用初始 state 并降级到内存运行
- 删除 `src/lib/storage.ts` 关联的类型导入（`Provider`、`Conversation`、`Message`、`MindMap`）

## Capabilities

### New Capabilities
<!-- 无新增能力 -->

### Modified Capabilities
- `indexeddb-store-adapter`: 增加 IndexedDB 初始化失败的异常处理，失败时降级为纯内存运行而非静默崩溃

## Impact

- 删除 `src/lib/storage.ts`（288 行）
- 修改 `src/lib/indexeddb-storage-adapter.ts`（~10 行变更）
- 无依赖变更，无 API 变更，无数据迁移
