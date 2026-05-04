## Context

三个持久化 store 通过 Zustand persist 默认写入 localStorage（5-10MB 上限 + 同步序列化）。`src/lib/storage.ts` 已有完整的 IndexedDB CRUD 层是死代码。直接用最小的桥接代码接上。

## Goals / Non-Goals

**Goals:**
- 三个持久化 store 改用 IndexedDB
- 保持 Zustand persist 接口兼容（state 序列化格式不变）

**Non-Goals:**
- 不迁移 localStorage 旧数据
- 不做降级（IndexedDB 不可用就报错）
- 不改 chatStore、不改任何组件

## Decisions

### D1: 适配器 — 新建 `indexeddb-storage-adapter.ts`

实现 Zustand persist 的 `StateStorage` 接口，直接操作 `zustand-persist` store：

```typescript
// src/lib/indexeddb-storage-adapter.ts
import { openDB } from 'idb'

const db = openDB('progressive-mindmap', 5, {
  upgrade(db, oldVersion) {
    if (oldVersion < 5) {
      db.createObjectStore('zustand-persist', { keyPath: 'name' })
    }
  },
})

export function createIndexedDBStorage() {
  return {
    getItem: async (name: string) => {
      const record = await (await db).get('zustand-persist', name)
      return record?.value ?? null
    },
    setItem: async (name: string, value: string) => {
      await (await db).put('zustand-persist', { name, value })
    },
    removeItem: async (name: string) => {
      await (await db).delete('zustand-persist', name)
    },
  }
}
```

### D2: DB 版本升级

`DB_VERSION` 4→5，升级回调新增 `zustand-persist` store。注意：`indexeddb-storage-adapter.ts` 自己调 `openDB` 带 upgrade 也行，但 `storage.ts` 里已有的 `getDb()` 也要支持 v5 避免冲突。两者都加。

### D3: Store 集成

每个 store 加一行：

```typescript
import { createIndexedDBStorage } from '@/lib/indexeddb-storage-adapter'

persist((set, get) => ({...}), {
  name: 'mindmap-store',
  version: 2,
  storage: createIndexedDBStorage(),
})
```

## Risks

- **[两个 openDB 调用]**: storage.ts 和 indexeddb-storage-adapter.ts 各自调 `openDB`（同一个 db 不同 version）→ `idb` 库会自动协调，先打开的优先。两个 upgrade 都要写 v5 逻辑确保不管谁先触发都正确。
- **[无降级]**: 隐私模式等场景 IndexedDB 不可用 → Zustand persist hydration 失败 → state 使用初始值 → 用户看到空应用。可接受——这是 P0 修复的目标状态。
