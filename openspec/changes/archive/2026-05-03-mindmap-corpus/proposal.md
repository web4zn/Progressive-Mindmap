## Why

目前内容来源有两种机制但都不清晰：全局物料池（`materialStore`）不属于任何图谱，Conversation 关联（`mindmapId`）是单向的。图谱不知道自己用了哪些内容生成，用户无法管理和溯源。需要引入一个纯粹的关联层——语料库（Corpus），它不存储内容，只记录「这张图谱用了哪些回答」。

## What Changes

- **删除 `materialStore` 和 `MaterialItem` 类型**：AI 回答天然存在于 `conversationStore`，不需要额外的「暂存区」或「物料池」。语料库直接从 `conversationStore` 引用消息。**BREAKING**: 整个 `materialStore` 文件删除。
- **新增 `CorpusEntry` 类型**：表达一条消息到图谱的关联。包含 `messageId`（指向原始回答）、`selectedText`（选中文本，作为原始回答的子文本）、`range`（字符偏移）、`enabled` 开关、`note` 备注。无 `type` 字段 — 统一为消息级。
- **`MindMap` 增加 `corpus` 字段**：存储该图谱的语料关联列表。图谱删除时语料随之删除。
- **`MindMap` 增加 `monitoredConversationIds` 字段**：图谱监听的对话列表。被监听对话产生新 AI 回答时，自动创建 CorpusEntry 并触发生成。
- **删除 `Conversation.mindmapId` 和 `Conversation.autoSync`**：关联关系完全由语料库表达，自动同步改为图谱级监听。**BREAKING**: Conversation 类型变更。
- **生成逻辑读取语料库**：`generateMindmap` 从 `mindmap.corpus` 收集已启用的条目，按 `messageId` 从 `conversationStore` 读取内容。有 `selectedText` 时只用片段，无 `selectedText` 时用整条消息。

## Capabilities

### New Capabilities
- `mindmap-corpus`: 语料库核心能力——图谱与消息的关联表、CRUD、启用/禁用、对话监听

### Modified Capabilities
- `mindmap-data`: MindMap 新增 `corpus` 和 `monitoredConversationIds`；Conversation 删除 `mindmapId` 和 `autoSync`；删除 `MaterialItem` 类型
- `mindmap-content-selection`: 删除 `materialStore`，消息直接加入图谱语料库（不经过暂存区）
- `mindmap-generation`: 生成过程从图谱语料库收集内容
- `conversation-management`: 删除 Conversation 的图谱关联字段和自动同步字段；新对话创建简化

## Impact

- **删除**: `src/stores/materialStore.ts`（整个文件）、`src/types/mindmap.ts` 中 `MaterialItem` 类型
- **类型系统**: `src/types/mindmap.ts` 新增 `CorpusEntry`，`MindMap` 新增 `corpus` + `monitoredConversationIds`
- **类型系统**: `src/types/conversation.ts` 删除 `mindmapId` 和 `autoSync`
- **状态管理**: `src/stores/mindmapStore.ts` 新增语料库 CRUD + 监听管理
- **UI 组件**: `MindMapPanel.tsx` 新增语料库管理界面；消息旁增加「加入语料库」操作
- **生成逻辑**: `src/lib/mindmap-generator.ts` 生成入口改为从 corpus 收集内容
- **ChatPage**: 删除 autoSync 相关逻辑；新增图谱监听触发逻辑
