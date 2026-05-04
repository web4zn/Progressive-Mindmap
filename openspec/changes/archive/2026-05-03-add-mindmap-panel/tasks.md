## 1. Data Model & Types

- [x] 1.1 Create `src/types/mindmap.ts` with `MindMap` and `MindMapNode` interfaces
- [x] 1.2 Update `src/types/index.ts` to export new MindMap types
- [x] 1.3 Update `src/types/conversation.ts` to add optional `mindmapId?: string` and `autoSync?: boolean` fields

## 2. Storage Layer

- [x] 2.1 Add `mindmaps` object store to IndexedDB schema in `src/lib/storage.ts`
- [x] 2.2 Implement `getAllMindmaps`, `getMindmapById`, `addMindmap`, `updateMindmap`, `removeMindmap` in IndexedDB adapter
- [x] 2.3 Add corresponding methods to `LocalStorageFallback` class
- [x] 2.4 Add mindmap methods to `StorageImpl` interface and `IndexedDBStorageAdapter`

## 3. MindMap Store

- [x] 3.1 Create `src/stores/mindmapStore.ts` with Zustand `persist` middleware
- [x] 3.2 Implement `addMindmap`, `removeMindmap`, `updateMindmapTree` actions
- [x] 3.3 Implement `activeMindmapId` state and `setActiveMindmapId` action
- [x] 3.4 Implement `getActiveMindmap` getter

## 4. LLM Generation Pipeline

- [x] 4.1 Create `src/lib/mindmap-generator.ts` with `buildMindmapPrompt` function (existing tree markdown + conversation messages → prompt)
- [x] 4.2 Implement `parseMarkdownToTree` function (# → root, ## → child, ### → grandchild, `—` separator for label/summary)
- [x] 4.3 Implement `treeToMarkdown` reverse function for incremental regeneration
- [x] 4.4 Implement `generateMindmap` async generator that streams LLM output and parses incrementally
- [x] 4.5 Add `conversationMessagesToHistory` helper to extract messages across all linked conversations

## 5. Recursive Tree View Component

- [x] 5.1 Create `src/features/mindmap/MindMapTree.tsx` with recursive `TreeNode` sub-component
- [x] 5.2 Implement expand/collapse state per node with Lucide chevron icons
- [x] 5.3 Style nodes: indentation per depth level, hover highlight, label text, summary sub-text
- [x] 5.4 Implement empty state ("此图谱暂无内容") and loading state (pulse skeleton)
- [x] 5.5 Implement error state with retry button
- [x] 5.6 Add vertical scroll for overflow content with sticky toolbar above

## 6. MindMap Panel Layout

- [x] 6.1 Create `src/features/mindmap/MindMapPanel.tsx` — top-level panel container
- [x] 6.2 Implement toolbar: MindMap selector dropdown, manual sync button, auto-sync toggle, export button, close button
- [x] 6.3 Create `ResizableSeparator` component with drag-to-resize (200px–600px range)
- [x] 6.4 Add global toggle button (`PanelRightOpen`/`PanelRightClose` icons) to ChatPage header
- [x] 6.5 Wire panel visibility state (local state, not persisted) and mindmap store

## 7. Conversation Integration

- [x] 7.1 Create `NewConversationDialog` component with three radio options (skip / pick existing / create new)
- [x] 7.2 Implement "关联到已有图谱" dropdown populated from mindmapStore
- [x] 7.3 Implement "创建新图谱" inline creation with name input
- [x] 7.4 Conditionally enable/disable auto-sync checkbox based on association choice
- [x] 7.5 Update ChatPage's `handleNewConversation` to open the dialog and pass mindmapId/autoSync to `addConversation`
- [x] 7.6 Update `conversationStore.addConversation` to accept optional `mindmapId` and `autoSync` params

## 8. Sidebar MindMap List

- [x] 8.1 Add "思维导图" section header in ConversationSidebar (below conversation list, above separator)
- [x] 8.2 Render mindmap list items with title and updatedAt relative time
- [x] 8.3 Implement "新建图谱" button that creates via the store
- [x] 8.4 Implement mindmap item rename (inline edit, Pencil icon) and delete (Trash2 icon with confirm dialog)
- [x] 8.5 Highlight active mindmap in list, set `activeMindmapId` on click

## 9. Wire Everything in ChatPage

- [x] 9.1 Restructure `ChatPage.tsx` layout: extract chat area from panels
- [x] 9.2 Add `MindMapPanel` with `ResizableSeparator` on the right side when toggle is on
- [x] 9.3 Adjust MessageList and MessageInput max-width dynamically based on panel visibility
- [x] 9.4 Hide panel and toggle button on mobile (<768px) via responsive classes
- [x] 9.5 Wire ConversationSettingsDialog to allow changing mindmapId and autoSync for existing conversations

## 10. Export

- [x] 10.1 Implement `exportMindmapAsMarkdown` in `src/lib/export.ts` (tree → markdown conversion)
- [x] 10.2 Wire export button in panel toolbar to trigger download

## 11. Testing & Polish

- [x] 11.1 Write unit tests for `parseMarkdownToTree` with valid, malformed, and edge-case inputs
- [x] 11.2 Write unit tests for `buildMindmapPrompt` and `treeToMarkdown`
- [x] 11.3 Write unit tests for `mindmapStore` actions
- [x] 11.4 Write unit tests for `MindMapTree` render states (empty, loading, error, multi-level tree)
- [x] 11.5 Verify existing tests (conversationStore, chatStore) still pass after model changes
- [ ] 11.6 Manual QA: dark mode / light mode appearance for tree nodes and panel
