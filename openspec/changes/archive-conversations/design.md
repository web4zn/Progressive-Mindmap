## Context

当前 `removeConversation` 直接从 store 中删除 Conversation 对象，导致所有关联的 CorpusEntry 引用悬空。改为"归档"模式后，Conversation 保留但标记为隐藏，Corpus 引用始终有效。

## Goals / Non-Goals

**Goals:**
- 归档对话从活跃列表隐藏，语料仍然可用
- 支持解档恢复
- 归档区内支持真正删除

**Non-Goals:**
- 不改变 Corpus / MindMap 生成逻辑
- 不增加数据迁移（旧数据 `archived` 默认 `false`）

## Decisions

### D1: `archived` 字段

```typescript
// src/types/conversation.ts
export interface Conversation {
  // ... existing fields
  archived?: boolean  // default false
}
```

### D2: Store actions

```typescript
archiveConversation: (id: string) => void   // 设为 archived: true
unarchiveConversation: (id: string) => void  // 设为 archived: false
// removeConversation 保留，用于从归档中真正删除
```

### D3: Sidebar 布局

```
┌─ 对话列表 ───────────────────────┐
│  📝 React 状态管理                 │  ← 活跃 (archived !== true)
│  📝 TypeScript 技巧                │
│                                   │
│  ▼ 已归档 (3)                     │  ← 可折叠分组
│     📦 早期测试对话      取消归档 删除 │
│     📦 Python 对比分析   取消归档 删除 │
│     📦 临时笔记          取消归档 删除 │
└──────────────────────────────────┘
```

归档区域默认折叠，点击展开。归档对话以浅色/灰色样式与活跃对话区分。

### D4: 删除逻辑

`removeConversation` 保留不变。归档区内删除才是真正删除（已有确认弹窗，保持不变）。

## Risks / Trade-offs

- **[归档对话仍占存储]**: 归档不释放 IndexedDB 空间。长期大量归档可能影响加载速度。可接受——脑图类应用单用户对话量不会达到瓶颈。
- **[UI 简洁性]**: 新增归档分组增加 sidebar 复杂度。通过默认折叠保持视觉干净。
