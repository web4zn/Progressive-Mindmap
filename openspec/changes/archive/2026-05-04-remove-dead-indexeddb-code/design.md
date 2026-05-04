## Context

`storage.ts` 是从 Iteration 1 就存在的 IndexedDB 抽象层，设计初衷是提供统一的持久化接口并在 IndexedDB 不可用时降级到 localStorage。但实际开发中 Zustand `persist` 中间件接管了所有持久化逻辑，`storage.ts` 被完全绕过，成为纯粹的遗留死代码。

## Goals / Non-Goals

**Goals:**
- 删除 `storage.ts` 及其所有导出
- 在 `indexeddb-storage-adapter.ts` 中处理 IndexedDB 初始化异常，防止静默崩溃

**Non-Goals:**
- 不引入 localStorage 降级（用户明确要求只用 IndexedDB）
- 不改动任何 store 或组件

## Decisions

### D1: 直接删除 storage.ts

全量引用检查确认零外部消费者。删除前再次运行 `npx tsc --noEmit` 确保无编译错误。

### D2: IndexedDB 失败 → 内存模式

在 `createIndexedDBStorage()` 的 `getItem`/`setItem`/`removeItem` 中增加 try/catch。IndexedDB 不可用时，操作静默失败（返回 null/void），Zustand 使用初始 state，应用正常渲染但数据不持久化。同时在 `createIndexedDBStorage()` 初始化时检测 IndexedDB 可用性并 console.error 提示。

### D3: 不引入 UI 错误提示（本次范围外）

错误提示 UI 属于独立功能，本次仅保证不崩溃。

## Risks / Trade-offs

- **[数据丢失]**: IndexedDB 不可用时用户数据不会持久化。这是设计选择——用户明确要求不做 localStorage 降级。
- **[测试环境]**: 删除 `storage.ts` 不影响任何现有测试（无引用）。
