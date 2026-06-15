# Node-Level LLM Conversation — Tasks

> 9 task blocks. Each block is a logical unit the verifier can
> check off independently. **Data model → Agent scope → UI → flow integration → tests.**

---

## 1. Data Model: `MindMapNode.linkedConversationId` + Schema v3

- [ ] 1.1 In `src/types/mindmap.ts`, add `linkedConversationId?: string` to `MindMapNode` interface (v3).
- [ ] 1.2 Bump `MINDMAP_SCHEMA_VERSION` from `2` to `3`.
- [ ] 1.3 Update `isV2MindMap` guard if needed (check: a v2 mindmap with `schemaVersion === 2` still matches the guard — verify the guard works with v3).
- [ ] 1.4 Create `src/lib/migration/mindmap-v2-to-v3.ts`:
  - Export `migrateV2ToV3(mindmap: MindMap): MindMap` — declaration-only (no data change, just stamp `schemaVersion: 3`).
  - Add a test in `src/lib/migration/__tests__/` that asserts a v2 mindmap passes through unchanged (just version stamp).
- [ ] 1.5 Wire the v3 migration into `mindmapStore.ts` — update the `migrate` callback in the `persist` middleware to chain v2→v3 after v1→v2.

## 2. Store Layer: `linkNodeConversation` / `unlinkNodeConversation`

- [ ] 2.1 In `src/stores/mindmapStore.ts`, implement `linkNodeConversation(mindmapId, nodeId, conversationId)`:
  - Uses existing `findAndUpdateNode` to set `linkedConversationId` on the target node.
  - Bumps `updatedAt` on the mindmap.
- [ ] 2.2 Implement `unlinkNodeConversation(mindmapId, nodeId)`:
  - Uses destructuring-rest (`const { linkedConversationId: _drop, ...rest } = node`) to remove the field.
  - Sets `editedByUser: true` and bumps `updatedAt`.
- [ ] 2.3 In `deleteNode` (mindmapStore), add a **preliminary hook** that does nothing yet — just a `// TODO: check linkedConversationId for cascade dialog (task 9)` comment at the call site in `MindMapTree.tsx`. The store itself does NOT cascade (the UI dialog controls it).
- [ ] 2.4 Update `duplicateNode` (or the duplicate logic in `MindMapTree.tsx` if it's done there) to strip `linkedConversationId` from the cloned node. If no explicit duplicate function exists in the store, this is handled in `MindMapTree.tsx` where the duplicate action is defined.
- [ ] 2.5 Write store tests in `src/stores/__tests__/mindmapStore.test.ts`:
  - `linkNodeConversation` sets the field.
  - `linkNodeConversation` overwrites an existing value.
  - `unlinkNodeConversation` removes the field.
  - Node move / reparent preserves `linkedConversationId` (existing tree operations pass through the field unchanged).

## 3. Agent Scope: Query Tool Visibility Limitation

> **Design doc reference:** `design.md §2`
> Files: `src/lib/agent/agent-tools.ts`, `src/lib/mindmap-generator.ts`

- [ ] 3.1 In `src/lib/agent/agent-tools.ts`, add module-level scope state:
  ```ts
  let _activeScopeNodeId: string | null = null
  export function setAgentScope(nodeId: string | null): void { _activeScopeNodeId = nodeId }
  export function getAgentScope(): string | null { return _activeScopeNodeId }
  ```
- [ ] 3.2 Add a `getQueryTree(tree: MindMapNode[]): MindMapNode[]` helper in the same file:
  - If `_activeScopeNodeId` is null, return `tree` as-is.
  - Otherwise, find the scope node via `findNodeById` and return `[scopeNode]`.
  - If scope node is not found (deleted during agent run), fall back to `tree`.
- [ ] 3.3 Refactor all 7 query tool handlers (`getNodeDetail`, `getChildren`, `getParent`, `getSiblings`, `getAncestors`, `getSubtree`, `searchNodes`) to use `getQueryTree(mm.tree)` instead of `mm.tree` directly.
  - Each tool must work naturally — an out-of-scope query returns `{ error: "未找到节点: {id}" }` or empty data, same as if the node genuinely doesn't exist.
  - `getParent` on a scope root → `{ parent: null }` (natural — the scope root has no parent in the query tree).
  - `getSiblings` on a scope root → `{ siblings: [] }`.
  - `getAncestors` on any scope node → path stops at scope root naturally because the query tree doesn't contain ancestors beyond it.
  - `searchNodes`: scope the search to query tree only.
- [ ] 3.4 Add `extractScopeSubtree(tree, scopeNodeId)` to `src/lib/mindmap-generator.ts`:
  - Locate the scope node in the tree, deep-clone it, return `[clonedScopeNode]`.
  - If scope node not found, return `tree` unchanged (fallback).
- [ ] 3.5 Add `applyScopedOperations(tree, scopeNodeId, ops)` to `src/lib/mindmap-generator.ts`:
  - Extract the scope node and its subtree.
  - Run `applyOperations` on the extracted subtree.
  - Replace the original scope node with the modified one in the full tree.
  - Reject `add_root` operations with `{ success: false, error: "不允许添加根节点" }` (no scope mention).
  - Skip operations referencing Node IDs not found in the scope subtree (with console.warn — not returned to LLM).
- [ ] 3.6 In `agent-tools.ts`, update `generateMindmapOps` handler:
  - If `_activeScopeNodeId` is set, call `applyScopedOperations` instead of `applyOperations`.
  - This is the only change — the rest of the handler (validation, store update) stays the same.
- [ ] 3.7 Write agent scope tests in `src/lib/agent/__tests__/agent-scope.test.ts`:
  - Query tools return scoped results.
  - Out-of-scope queries return natural "not found".
  - `getParent` on scope root returns `null`.
  - `applyScopedOperations` rejects `add_root`.
  - `applyScopedOperations` skips operations on IDs not in scope.

## 4. Agent Scope: Hook Propagation

> **Design doc reference:** `design.md §3`
> Files: `src/hooks/useMindmapAgent.ts`, `src/lib/agent/types.ts`

- [ ] 4.1 In `src/lib/agent/types.ts`, add `scopeNodeId?: string` to `ENHANCE_MESSAGE` and `MEDIATE_MESSAGE` payloads (for logging/diagnostics only — Worker doesn't need it).
- [ ] 4.2 In `src/hooks/useMindmapAgent.ts`:
  - Change `enhanceMessage(conversationId)` to `enhanceMessage(conversationId, scopeNodeId?)`.
  - Before posting `ENHANCE_MESSAGE`: if scopeNodeId is provided, call `setAgentScope(scopeNodeId)` and extract `scopeTree = extractScopeSubtree(mm.tree, scopeNodeId)`, then pass `mindmapTreeToFlatContext(scopeTree)` as the tree JSON.
  - If scopeNodeId is NOT provided, call `setAgentScope(null)` (cleanup).
  - Mirror the same changes for `mediateMessage`.
  - Add a `.finally(() => setAgentScope(null))` or equivalent cleanup so the scope state doesn't leak across different agent invocations.
- [ ] 4.3 Add a `findNodeByLinkedConv(tree: MindMapNode[], convId: string): MindMapNode | null` helper to `src/lib/mindmap-generator.ts` (or `agent-tools.ts` — pick one).
  - Walks the tree BFS/DFS, returns the first node whose `linkedConversationId === convId`.
  - Used by ChatPage to detect scope when an agent trigger fires.
- [ ] 4.4 Write hook-level tests in `src/hooks/__tests__/useMindmapAgent.test.ts` (or a new `agent-scope-propagation.test.ts`):
  - Verify `enhanceMessage` with scopeNodeId triggers `setAgentScope`.
  - Verify the tree passed to Worker is the scoped subtree.
  - Verify scope is reset to null after agent completes.

## 5. UI: Context Menu "Ask LLM"

> Files: `src/features/mindmap/MindMapContextMenu.tsx`, `MindMapTree.tsx`

- [ ] 5.1 In `MindMapContextMenu.tsx`:
  - Add `askLlm` to `MENU_ORDER` (between `edit` and `addChild`).
  - Add `onAskLlm: () => void` to `ContextMenuProps`.
  - Add the button rendering: `<button> <MessageCircle className="w-3.5 h-3.5" /> Ask LLM </button>` with an appropriate lucide icon (`MessageCircle` or `Bot`).
  - Wire the `'askLlm'` key in the `trigger` function.
- [ ] 5.2 In `MindMapTree.tsx`:
  - Add `onAskLlm` to the `MindMapTreeHandle` (or equivalent props interface that the tree passes to the context menu).
  - Add `onAskLlm` forwarding in the context menu's `onAskLlm` prop — connect it to `MindMapPanel`'s `handleAskLlm` via the existing `onEditorOpen`-style prop chain.
  - Add `handleAskLlm(nodeId)` local handler that:
    - Checks `linkedConversationId` on the node.
    - If exists → calls `onNavigateToConversation(linkedConversationId)` (a new prop, see task 6).
    - If not → calls `onAskLlm(nodeId, label, summary, content)` (a new prop that bubbles up to `MindMapPanel`).
- [ ] 5.3 Write test: `MindMapContextMenu` renders "Ask LLM" entry; clicking it invokes `onAskLlm`.

## 6. UI: 💬 Bubble Icon in FlowNode

> Files: `src/components/flow-shell/FlowNode.tsx`

- [ ] 6.1 In `FlowNode.tsx`, after the content rendering area, add a conditional 💬 icon:
  ```tsx
  {data.linkedConversationId && !data.isFullscreen && (
    <button
      className="absolute bottom-1 right-1 opacity-50 hover:opacity-100 transition-opacity cursor-pointer bg-background/60 rounded-full p-0.5 z-10"
      title="进入关联对话"
      data-testid="node-conversation-bubble"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onBubbleClick?.(data.id)
      }}
    >
      <MessageCircle className="w-3 h-3" />
    </button>
  )}
  ```
  - Icon only shows when `linkedConversationId` is present.
  - Icon hidden in fullscreen mode (tooltip on hover: "退出全屏以进入对话" via `title` attribute).
  - The `MessageCircle` icon from lucide-react.
- [ ] 6.2 Add `onBubbleClick?: (nodeId: string) => void` to `FlowNodeProps` (or equivalent — trace through `BaseNode` / `RectCardNode` props if the abstraction layer uses a shared type).
  - If `FlowNode` receives a generic `data` object, the `onBubbleClick` might come from a parent callback. Check the existing `data` shape and add `linkedConversationId` to `FlowNodeData` type.
- [ ] 6.3 Wire `onBubbleClick` from `FlowShell` → `MindMapTree` → to a handler that:
  - Reads the node's `linkedConversationId` from the store.
  - If conversation exists → calls `setActiveConversationId(linkedConversationId)`.
  - Triggers `centerOnNode(nodeId)` if the mindmap is not in fullscreen (see task 8).
- [ ] 6.4 Write test: 💬 renders when `linkedConversationId` is set, hidden when absent, hidden in fullscreen.

## 7. UI: Ask LLM Flow (Create Conversation + Link + Navigate)

> Files: `src/features/mindmap/MindMapPanel.tsx`, `src/features/chat/ChatPage.tsx`

- [ ] 7.1 In `MindMapPanel.tsx`, add `handleAskLlm(nodeId: string, label: string, summary: string, content?: string)`:
  ```ts
  const handleAskLlm = useCallback((nodeId: string, label: string, ...) => {
    // 1. Read node from active mindmap
    const mm = useMindmapStore.getState().getActiveMindmap()
    if (!mm) return
    
    // 2. Check if already linked
    const node = findNodeById(mm.tree, nodeId)
    if (!node) return
    if (node.linkedConversationId) {
      // Reuse existing — just navigate
      setActiveConversationId(node.linkedConversationId)
      return
    }
    
    // 3. Create new conversation
    const activeConv = useConversationStore.getState().getActiveConversation()
    const providerId = activeConv?.providerId ?? providers[0]?.id ?? ''
    const modelId = activeConv?.modelId ?? providers[0]?.models.find(m => m.enabled)?.id ?? ''
    
    const newConv = addConversation({ providerId, modelId })
    
    // 4. Build system prompt = global system prompt + node context
    const globalSystemPrompt = activeConv?.systemPrompt ?? ''
    const nodeContext = [
      '',
      '当前讨论聚焦于以下知识点：',
      `- 节点：${label}`,
      `- 摘要：${summary}`,
      content ? `- 内容：${content}` : '',
      '',
      '请基于以上话题展开。',
    ].join('\n')
    
    updateConversation(newConv.id, {
      systemPrompt: globalSystemPrompt
        ? `${globalSystemPrompt}\n\n${nodeContext}`
        : nodeContext,
    })
    
    // 5. Link
    addMonitoredConversation(mm.id, newConv.id)
    linkNodeConversation(mm.id, nodeId, newConv.id)
    
    // 6. Navigate
    setActiveConversationId(newConv.id)
  }, [...deps])
  ```
  - **Note**: `providers` comes from `useProviderStore`. `addConversation`, `updateConversation` from `useConversationStore`. `addMonitoredConversation`, `linkNodeConversation` from `useMindmapStore`.
- [ ] 7.2 Wire `handleAskLlm` through `MindMapTree` (via props) so the context menu's `onAskLlm` reaches this handler.
- [ ] 7.3 In `src/features/chat/ChatPage.tsx`, update the `onStreamComplete` callback:
  ```ts
  const onStreamComplete = useCallback((convId: string, _msgId: string) => {
    // Check if this conversation is linked to a node (scope mode)
    const mm = useMindmapStore.getState().mindmaps.find(m =>
      m.monitoredConversationIds?.includes(convId),
    )
    const scopeNodeId = mm ? findNodeByLinkedConv(mm.tree, convId)?.id ?? undefined : undefined
    
    if (scopeNodeId) {
      agent.enhanceMessage(convId, scopeNodeId)
    } else {
      agent.enhanceMessage(convId)
    }
  }, [agent])
  ```
- [ ] 7.4 Add a test for `findNodeByLinkedConv`: walks tree, returns correct node, returns null when no match.

## 8. UI: Navigation — Center on Node After Conversation Jump

> File: `src/features/mindmap/MindMapTree.tsx`, `src/features/mindmap/MindMapPanel.tsx`

- [ ] 8.1 Ensure `FlowShell` already exposes a `centerOnNode(nodeId)` mechanism (Stage A1 had `onNodeDoubleClick → fitView`, Stage D had the drill-down `centerOnNode`). If it does, skip — wire it in the handler.
  - Check: `FlowShellHandle` was extended with `centerOnNode` in commit `ed2e47d` (recent). This is already available.
- [ ] 8.2 In `MindMapPanel.tsx`, when `setActiveConversationId` is called as part of Ask LLM or 💬 click, also schedule a `centerOnNode` on the next tick (use `setTimeout(() => ..., 0)` or `requestAnimationFrame` to let React re-render first).
  - The `centerOnNode` call goes through `FlowShellHandle.centerOnNode(nodeId)`.
  - `MindMapPanel` already passes `flowShellRef` or has access via `MindMapTree`.
- [ ] 8.3 Verify: after Ask LLM creates a conversation and navigates, the brain switches to the conversation view AND the mindmap canvas is hidden behind (for desktop widths). The `centerOnNode` fires when the user opens the mindmap back up (not while chat is focused). → Update: `centerOnNode` fires immediately on the mindmap canvas even if it's visually hidden — React Flow tracks the node position internally. When the user switches back to the mindmap, the viewport is already centered.
- [ ] 8.4 Add test: `centerOnNode` is called when `onBubbleClick` fires with a valid `linkedConversationId`.

## 9. UI: Delete Cascade Confirmation Dialog

> File: `src/features/mindmap/MindMapTree.tsx`

- [ ] 9.1 In `MindMapTree.tsx`, add a confirmation dialog state:
  ```ts
  const [deleteCascade, setDeleteCascade] = useState<{
    nodeId: string
    linkedConversationId: string
  } | null>(null)
  ```
- [ ] 9.2 Before the existing delete confirmation (or replace it for nodes with `linkedConversationId`), check `linkedConversationId`:
  - If present → open the cascade dialog (9.3) instead of the simple delete confirm.
  - If absent → use the existing delete flow unchanged.
- [ ] 9.3 Render a `Dialog` (from `@/components/ui/dialog`) when `deleteCascade !== null`:
  ```tsx
  <Dialog open={deleteCascade !== null} onOpenChange={(open) => { if (!open) setDeleteCascade(null) }}>
    <DialogContent>
      <DialogHeader><DialogTitle>删除节点</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">
        该节点关联了一个对话「{deleteCascade.label}」，是否同时删除对话？
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={deleteConversationToo}
          onChange={(e) => setDeleteConversationToo(e.target.checked)}
        />
        同时删除关联的对话
      </label>
      <DialogFooter>
        <Button variant="outline" onClick={() => setDeleteCascade(null)}>取消</Button>
        <Button variant="destructive" onClick={handleCascadeDelete}>确认删除</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  ```
- [ ] 9.4 Implement `handleCascadeDelete`:
  - If checkbox is checked: `removeConversation(linkedConversationId)` + `deleteNode(mindmapId, nodeId)`.
  - If unchecked: `unlinkNodeConversation(mindmapId, nodeId)` + `deleteNode(mindmapId, nodeId)`.
  - Close the dialog.
- [ ] 9.5 Write test:
  - Delete node with `linkedConversationId` → dialog appears.
  - Delete node without → no dialog (existing behavior).
  - Cascade dialog with checkbox unchecked → only unlinks.
  - Cascade dialog with checkbox checked → removes conversation too.

## 10. Final Verification

- [ ] 10.1 `npm run lint` — clean.
- [ ] 10.2 `npm test` — full suite green (all new tests + no regressions on existing 130+ tests).
- [ ] 10.3 `npm run build` — clean.
- [ ] 10.4 Manual smoke test:
  - Open a mindmap → right-click a node → "Ask LLM" → new conversation opens → send a message → Agent enhances only that node's subtree.
  - 💬 icon appears on the node → click it → switches to that conversation.
  - Right-click the same node → "Ask LLM" → navigates to the existing conversation (no duplicate creation).
  - Delete the node → cascade dialog shows → unlink vs delete conversation both work.
  - Full-screen mindmap → 💬 icon shows tooltip but doesn't navigate.
  - Duplicate a node with linked conversation → new node doesn't have the link.
  - Move/reparent a node → linked conversation preserved.
  - Global conversation (no scope) → Agent enhances the full tree as before (no regression).
- [ ] 10.5 Update `AGENTS.md`: Add a note about `linkedConversationId` field in the `Architecture > Mindmap` section (or the existing node data description).

---

## Dependency Graph

```
Task 1 (Data Model) ──► Task 2 (Store) ──► Task 7 (Ask LLM flow)
                                                 │
Task 3 (Agent scope) ◄───────────────────────────┘ (depends on scope state)
          │
Task 4 (Hook propagation) ◄──┘
          │
          ├──► Task 7.3 (ChatPage scope trigger)
          │
          └──► Task 8 (Navigation)

Task 5 (Context menu) ────► Task 7 (flows through props)
Task 6 (💬 icon) ──────────► Task 8 (centerOnNode)

Task 9 (Delete cascade) ─── independent (depends on store operations from Task 2)

Task 10 (Verification) ──── after all above
```

Tasks 3+4 (Agent scope), 5 (Context menu), 6 (💬 icon), and 9 (Delete cascade) can be implemented in parallel once Task 1+2 are complete.
