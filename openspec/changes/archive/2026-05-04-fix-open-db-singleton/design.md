## Context

当前 `storage.ts` 和 `indexeddb-storage-adapter.ts` 各自独立调用 `openDB('progressive-mindmap', 5)`。前者的 upgrade 创建 `providers`/`conversations`/`messages`/`mindmaps` 四个 store，后者创建 `zustand-persist` 一个 store。由于 IndexedDB 的同版本 upgrade 只执行一次，两个 upgrade 回调存在竞争。

## Goals / Non-Goals

**Goals:**
- 单一 `openDB` 调用，统一 upgrade 回调
- 现有功能不受影响

**Non-Goals:**
- 不改动数据库版本号
- 不改动任何 store 或组件

## Decisions

### D1: 新建 `src/lib/db.ts` 作为连接单例

```typescript
// src/lib/db.ts
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'progressive-mindmap'
const DB_VERSION = 5

let dbPromise: ReturnType<typeof openDB> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('providers', { keyPath: 'id' })
          db.createObjectStore('conversations', { keyPath: 'id' })
          db.createObjectStore('messages', { keyPath: 'id' })
          db.createObjectStore('mindmaps', { keyPath: 'id' })
        }
        if (oldVersion < 5) {
          db.createObjectStore('zustand-persist', { keyPath: 'name' })
        }
      },
    })
  }
  return dbPromise
}
```

`storage.ts` 和 `indexeddb-storage-adapter.ts` 删除各自的 `openDB` 调用，改为 `import { getDb } from './db'`。

### D2: 保留各自文件的 wrapper 函数

`storage.ts` 的 `getDb()` 由内部 wrapper 改为导入 `db.ts` 的 `getDb()`。`indexeddb-storage-adapter.ts` 同样改为导入方式。

## Risks / Trade-offs

- **[新增模块依赖]**: `db.ts` 被两个文件导入 → 新增模块耦合。极低风险，因为两者本就依赖同一 IndexedDB。
- **[test 环境]**: happy-dom 不支持 IndexedDB，单例模式不影响现有 mock 方式（`vi.fn().mockResolvedValue` 可直接 mock `getDb`）。
