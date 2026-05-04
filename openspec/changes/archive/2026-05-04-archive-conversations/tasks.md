## 1. Data model

- [ ] 1.1 Add `archived?: boolean` to `Conversation` type in `src/types/conversation.ts`

## 2. Store

- [ ] 2.1 Add `archiveConversation(id: string)` action to `src/stores/conversationStore.ts`
- [ ] 2.2 Add `unarchiveConversation(id: string)` action to `src/stores/conversationStore.ts`

## 3. Sidebar UI

- [ ] 3.1 Split conversation list into active (`!c.archived`) and archived (`c.archived`) sections
- [ ] 3.2 Add collapsible "已归档" section below active list (hidden when empty)
- [ ] 3.3 Replace "删除" button on active conversations with "归档" (Archive icon)
- [ ] 3.4 Add "取消归档" and "删除" buttons to archived items
- [ ] 3.5 Style archived items with muted appearance to distinguish from active

## 4. Verify

- [ ] 4.1 Run `npx tsc --noEmit` — zero errors
- [ ] 4.2 Run `npm test` — all existing tests pass
- [ ] 4.3 Manual test — archive conversation, verify it appears in archived section, verify corpus still works for generation
