## Purpose

Provide a Zustand persist storage adapter backed by IndexedDB (DB v5 with the `zustand-persist` store) and explicitly forbid localStorage fallback or downgrades.

## Requirements

### Requirement: IndexedDB storage adapter
系统 SHALL 提供 `createIndexedDBStorage()` 返回 `{ getItem, setItem, removeItem }`，通过 `zustand-persist` store（keyPath: `name`）读写序列化 state。

#### Scenario: Store and retrieve
- **WHEN** `setItem('mindmap-store', '<JSON>')` 后 `getItem('mindmap-store')`
- **THEN** 返回 `<JSON>`

#### Scenario: Remove
- **WHEN** `removeItem('mindmap-store')`
- **THEN** 后续 `getItem` 返回 `null`

#### Scenario: Key not found
- **WHEN** `getItem('nonexistent')`
- **THEN** 返回 `null`

### Requirement: DB upgrade to v5
系统 SHALL 升级 DB_VERSION 到 5，新增 `zustand-persist` store。

#### Scenario: Upgrade creates the zustand-persist store
- **WHEN** 打开版本低于 5 的既有数据库
- **THEN** 系统将 DB_VERSION 升级到 5，并创建 `zustand-persist` object store

### Requirement: No migration, no fallback
系统 SHALL NOT 读取 localStorage 旧数据，SHALL NOT 降级。

#### Scenario: No localStorage fallback
- **WHEN** IndexedDB 中没有可用的持久化数据
- **THEN** 系统不读取 localStorage 旧数据，也不降级到其他存储
