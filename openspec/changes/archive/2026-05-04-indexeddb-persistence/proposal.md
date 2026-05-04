## Why

当前三个持久化 Zustand store（mindmapStore、conversationStore、providerStore）使用 `persist` 中间件默认写入 `localStorage`。localStorage 有两个致命限制：(1) 5-10MB 存储上限，随着对话和脑图累积必然溢出导致数据丢失；(2) 同步序列化整个 state 树，大对象时阻塞主线程造成 UI 卡顿。

项目在 `src/lib/storage.ts` 中已经实现了完整的 IndexedDB CRUD 层（283 行代码，包含 providers/conversations/messages/mindmaps 四个 object store 和 LocalStorage 降级方案），但从未被任何 store 导入使用，属于死代码。接上这条路径是极低成本的修复。

## What Changes

- **激活 IndexedDB 存储层**：创建 `src/lib/indexeddb-storage-adapter.ts`，实现 Zustand persist 所需的 `getItem/setItem/removeItem` 接口，直接读写 IndexedDB
- **更新三个持久化 store**：mindmapStore、conversationStore、providerStore 的 persist 配置增加 `storage: createIndexedDBStorage()` 选项
- **不做迁移**：不读取 localStorage 旧数据，从零开始
- **不做降级**：IndexedDB 不可用即报错，不静默回退 localStorage

## Capabilities

### New Capabilities
- `indexeddb-store-adapter`: Zustand persist 中间件的 IndexedDB storage 适配器，桥接 storage.ts 与 Zustand 的 storage 协议

### Modified Capabilities
- `mindmap-data`: 脑图数据持久化方式从 localStorage 改为 IndexedDB，数据模型和行为不变
- `conversation-management`: 对话数据持久化方式从 localStorage 改为 IndexedDB
- `model-provider`: 供应商数据持久化方式从 localStorage 改为 IndexedDB

## Impact

- **文件变更**：`src/lib/storage.ts`（DB_VERSION 4→5，新增 zustand-persist store），`src/stores/mindmapStore.ts`（persist 配置更新），`src/stores/conversationStore.ts`（persist 配置更新），`src/stores/providerStore.ts`（persist 配置更新）
- **新增文件**：`src/lib/indexeddb-storage-adapter.ts`（Zustand StateStorage 协议适配器）
- **新增文件**：`src/lib/__tests__/indexeddb-storage-adapter.test.ts`（适配器单元测试）
- **不影响**：chatStore（transient）、React Flow 组件、MindMapPanel、ChatPage、所有现有测试
- **数据影响**：用户首次运行时自动从 localStorage 迁移到 IndexedDB，迁移完成后 localStorage 旧数据保留作为回退安全网
