## 1. Data Model & Migration

- [x] 1.1 Extend `MindMapNode` type with `sourceExcerpts: Record<string, string>` and `editedByUser: boolean` fields
- [x] 1.2 Change `Conversation.mindmapId?: string` to `mindmapIds: string[]` in types and store
- [x] 1.3 Bump IndexedDB DB_VERSION to 3, add migration logic for `mindmapId` → `mindmapIds`
- [x] 1.4 Update all references to `conversation.mindmapId` throughout codebase (ChatPage, MindMapPanel, ConversationSidebar, settings dialog, NewConversationDialog)
- [x] 1.5 Update Zustand `persist` middleware and `LocalStorageFallback` for new fields

## 2. Content Selection Foundation

- [x] 2.1 Create `MaterialItem` type (`src/types/mindmap.ts`)
- [x] 2.2 Create `useMaterialStore` Zustand store with add/remove/clear actions
- [x] 2.3 Add checkbox UI to `MessageBubble` for selecting messages as materials
- [x] 2.4 Implement right-click context menu "加入脑图物料" on text selection in messages
- [x] 2.5 Add drag-to-panel support: drop message onto mindmap panel area → add to material pool
- [x] 2.6 Add material pool UI section to `MindMapPanel` (collapsible list with remove/clear)
- [x] 2.7 Wire `handleGenerate` to prioritize material pool content over full conversations

## 3. Streaming Preview & Progress

- [x] 3.1 Modify `MindMapPanel.handleGenerate` to call `parseMarkdownToTree` inside the stream loop (debounced 150ms)
- [x] 3.2 Pass `setTree` callback to iterative updates during generation
- [x] 3.3 Add progress counter: track `treeNodeCount` and `maxDepth` during parse, display as "已生成 N 个主题 · 深度 X/3"
- [x] 3.4 Extract `reasoning_content` from stream chunks if present, store in local state
- [x] 3.5 Add collapsible "AI 思考过程" section to `MindMapPanel`
- [x] 3.6 Wrap `parseMarkdownToTree` in try/catch during streaming to handle partial parse failures gracefully
- [x] 3.7 Add streaming visual cues to `MindMapTree`: dashed border or "…" suffix for incomplete leaf nodes

## 4. Generation Quality Optimization

- [x] 4.1 Add few-shot examples to `buildSystemPrompt`: one for first generation, one for incremental update
- [x] 4.2 Implement JSON mode output: add `response_format: { type: \"json_object\" }` when provider supports it
- [x] 4.3 Create `parseJsonToTree` function as alternative to `parseMarkdownToTree`
- [x] 4.4 Implement provider capability detection for JSON mode support
- [x] 4.5 Add retry logic (max 1 retry) with stricter prompt when JSON parsing fails
- [x] 4.6 Implement quality validation: duplicate detection, empty node removal, depth/breadth check
- [x] 4.7 Display validation results as non-blocking warnings in panel, with "auto-fix" option

## 5. Source Tracking (sourceConversationIds)

- [x] 5.1 Annotate messages in LLM prompt with identifiers: `[conv-X, msg-Y]`
- [x] 5.2 Update prompt to require source annotation in output (both JSON and Markdown modes)
- [x] 5.3 Implement `mapSourceIds`: parse LLM-returned source annotations → actual `sourceConversationIds`
- [x] 5.4 Store message excerpts in `sourceExcerpts: Record<string, string>` during parsing
- [x] 5.5 Fallback: assign latest conversation ID when LLM omits source annotation
- [x] 5.6 Add "查看来源" button on nodes that shows source conversation excerpts

## 6. Node Manual Editing

- [x] 6.1 Add Zustand actions: `updateNode`, `addChildNode`, `deleteNode`, `moveNode`
- [x] 6.2 Implement recursive node find/replace helper for tree traversal
- [x] 6.3 Add double-click edit mode to `TreeNode`: toggle between text and input fields
- [x] 6.4 Implement edit confirm (Enter/blur) and cancel (Escape)
- [x] 6.5 Add right-click context menu to `TreeNode` with full operation set
- [x] 6.6 Implement move operations: up/down (reorder), promote, demote
- [x] 6.7 Implement delete with confirmation dialog
- [x] 6.8 Set `editedByUser: true` and clear `sourceConversationIds` on manual edit
- [x] 6.9 Add `editedByUser` check before auto-sync/manual-sync overwrite; show "覆盖/保留" prompt

## 7. Cross-Mindmap Linking (N:N)

- [x] 7.1 Update `ConversationSettingsDialog` to use multi-select for mindmap association
- [x] 7.2 Update `NewConversationDialog` to support multi-select mindmap linking
- [x] 7.3 Add mindmap badge to `ConversationSidebar` items (show count of linked mindmaps)
- [x] 7.4 Update auto-sync logic to target only `mindmapIds[0]` (primary)
- [x] 7.5 Add primary mindmap selector in conversation settings (drag-to-reorder or dropdown)
- [x] 7.6 Update `MindMapPanel` filter logic: `c.mindmapIds?.includes(activeMindmapId)`

## 8. Verification & Polish

- [x] 8.1 Run `lsp_diagnostics` on all changed files, fix type errors
- [x] 8.2 Verify IndexedDB migration: create old-format data → reload → verify migration
- [x] 8.3 Test streaming preview with various LLM providers (OpenAI, DeepSeek)
- [x] 8.4 Test JSON mode fallback when provider doesn't support it
- [x] 8.5 Test content selection: regular messages, text fragments, empty pool fallback
- [x] 8.6 Test node editing: create, edit, delete, move, undo overwrite protection
- [x] 8.7 Test N:N linking: multi-select, badge display, auto-sync primary target
