## Context

当前系统有两个独立的内容来源机制：
1. **全局物料池** (`materialStore`): 一组 `MaterialItem[]`，不关联任何图谱
2. **Conversation 关联** (`Conversation.mindmapId`): 单向指向

生成时二选一（物料池优先 → 关联对话）。两者都绕过了核心问题：图谱不知道自己用了哪些回答。

新模型的核心理念：**AI 回答天然存在于 `conversationStore`，语料库只做关联**。

## Goals / Non-Goals

**Goals:**
- 删除 `materialStore` 和 `MaterialItem` — 不需要中间暂存区
- `CorpusEntry` 统一为消息级关联，无 `type` 字段
- `MindMap.corpus` 作为关联表，`MindMap.monitoredConversationIds` 作为监听列表
- CorpusEntry.selectedText 作为原始回答的子文本，通过 `range` 可追溯
- 生成逻辑从 corpus 收集启用的条目内容

**Non-Goals:**
- 不保留 `Conversation.mindmapId` 和 `Conversation.autoSync`（直接删除）
- 不保留 `materialStore`（整个文件删除）
- 不改变 IndexedDB 存储层方案

## Decisions

### Decision 1: CorpusEntry 类型（纯关联，无内容存储）

```typescript
interface CorpusEntry {
  id: string                    // UUID
  messageId: string             // 指向 conversationStore 中的 Message
  selectedText?: string         // 选中文本片段（原始回答的子文本）
  range?: { start: number; end: number }  // 选中文本在原始回答中的字符偏移
  enabled: boolean              // 是否参与生成，默认 true
  note?: string                 // 用户备注
  addedAt: number               // 添加时间戳
}
```

- `selectedText` 是 `messageId` 指向的 Message 的子文本，不是替代关系
- 生成时：有 `selectedText` → 只用片段；无 → 用整条消息
- `range` 用于追溯和实时截取（如果 Message.content 被更新，仍能通过 range 定位）
- 无 `type` 字段 — 所有语料统一为消息级

### Decision 2: 删除 materialStore

AI 回答完成后自动进入 `conversationStore`，用户无需「先加入暂存区再分配」。消息加入图谱语料库是直接操作：用户在消息旁点击「加入语料库」或选中文本右键「加入语料库」，直接创建 CorpusEntry。

**为什么不留暂存区**: 暂存区作为中间跳板增加了认知负担。用户操作不变简单，数据流多一层。

### Decision 3: 对话监听（替代 autoSync）

```
旧: Conversation.autoSync = true → 每次 AI 回复完自动触发该对话关联图谱的生成
新: MindMap.monitoredConversationIds = ["conv-1", "conv-2"] → 这些对话有新回答时自动创建 CorpusEntry → 自动触发该图谱生成
```

监听是图谱主动的行为（「我关注这些对话」），而非对话被动的标记。

触发流程：
```
AI 回复完成 (conversationId: "conv-1")
    │
    ▼
检查所有 MindMap 的 monitoredConversationIds 是否包含 "conv-1"
    │
    ▼ 是
自动创建 CorpusEntry({ messageId: newMsgId, enabled: true })
    │
    ▼
自动触发该图谱的生成（debounce 5s）
```

### Decision 4: 选中文本追溯

`CorpusEntry.range` 存储字符偏移。生成时，系统优先通过 `range` 从 `Message.content` 实时截取：

```typescript
function getCorpusContent(entry: CorpusEntry, msg: Message): string {
  if (entry.range && entry.selectedText) {
    // 验证一致性
    const sliced = msg.content.slice(entry.range.start, entry.range.end)
    if (sliced === entry.selectedText) return sliced
    // 不一致时降级使用 selectedText
    return entry.selectedText
  }
  if (entry.selectedText) return entry.selectedText
  return msg.content.slice(0, 2000)  // 整条消息，截断 2000 字符
}
```

UI 展示时直接用 `selectedText`（避免每次去查原始消息）。

### Decision 5: 批量加入对话

「将整个对话加入语料库」不是 CorpusEntry 的一种类型，而是一个批量操作：遍历对话的所有消息（或仅 AI 回复），为每条创建一条 CorpusEntry。这样每条消息可独立开关。

## Risks / Trade-offs

- **[风险] 语料库列表长**: 一个对话 50 条消息全加入 → 50 条 CorpusEntry → **缓解**: 列表按来源对话分组折叠显示
- **[风险] 语料来源被删除**: Conversation 删除后 CorpusEntry.messageId 失效 → **缓解**: 生成时 skip，UI 标记「来源已删除」
- **[风险] 选中文本与原始回答不同步**: 用户编辑了原始回答后 range 可能对不上 → **缓解**: 生成时校验 range 截取结果 === selectedText，不一致降级使用 selectedText
