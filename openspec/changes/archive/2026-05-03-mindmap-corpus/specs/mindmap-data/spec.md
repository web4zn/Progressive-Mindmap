## MODIFIED Requirements

### Requirement: MindMap data model
系统 SHALL 使用以下数据模型表示思维导图：

```
MindMap {
  id: string                       // UUID
  title: string                    // 图谱标题
  tree: MindMapNode[]              // 根层级节点列表
  corpus: CorpusEntry[]            // 语料库条目列表（新增）
  monitoredConversationIds: string[] // 监听的对话 ID 列表（新增）
  createdAt: number                // 创建时间戳
  updatedAt: number                // 更新时间戳
  generatorProviderId?: string
  generatorModelId?: string
}
```

## REMOVED Requirements

### Requirement: Conversation-MindMap linking
**Reason**: 替换为语料库（Corpus）机制。图谱的对话关联现在通过 `MindMap.corpus` 表达，一个对话的消息可被多个图谱引用。图谱的监听关系通过 `monitoredConversationIds` 表达。
**Migration**: `Conversation.mindmapId` 和 `Conversation.autoSync` 字段删除。

### Requirement: MaterialItem data model
**Reason**: `materialStore` 整个模块删除。AI 回答天然存在于 `conversationStore`，用户直接将消息加入图谱语料库，不需要中间暂存区。
**Migration**: `src/stores/materialStore.ts` 文件删除，`MaterialItem` 类型删除。

### Requirement: Delete mindmap
**Reason**: 删除图谱时无需再清除关联 Conversation 的 `mindmapId`（字段已删除）。
**Migration**: 删除图谱时仅删除图谱自身数据及其语料。
