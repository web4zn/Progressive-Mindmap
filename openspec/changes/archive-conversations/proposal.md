## Why

当前"删除对话"操作有两个问题：
1. **数据不可逆**：删除后语料库中的 CorpusEntry 引用悬空，`collectCorpusContent` 静默跳过，用户丢失知识来源
2. **无法恢复**：误操作无法撤回

改为"归档"模式：对话不删除，仅从活跃列表隐藏。语料库始终可用，用户可随时解档恢复。

## What Changes

- **Conversation 类型**：新增可选 `archived` 字段（默认 `false`）
- **Sidebar**：活跃列表仅显示未归档对话；新增可折叠的"归档"分组
- **对话操作**：活跃对话的"删除"按钮改为"归档"；归档区内的对话显示"取消归档"和"真正删除"
- **Corpus / 生成**：零改动——归档对话的语料照常可用

## Capabilities

### New Capabilities
- `conversation-archive`: 对话归档与恢复——归档的对话从活跃列表隐藏，语料保持可用

### Modified Capabilities
- `conversation-management`: 新增 `archived` 字段，新增 `archiveConversation` / `unarchiveConversation` action

## Impact

- 修改 `src/types/conversation.ts`（Conversation +1 字段）
- 修改 `src/stores/conversationStore.ts`（+2 actions）
- 修改 `src/features/conversation/ConversationSidebar.tsx`（UI 重排）
- 无破坏性变更：`archived` 为可选字段，默认 `false`
- Corpus / 生成逻辑零变更
