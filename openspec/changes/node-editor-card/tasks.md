# Node Editor Card — Tasks

> 6 task blocks. Each block is a logical unit the verifier can
> check off independently. The change is intentionally
> **mechanical after task 2** — task 2 builds the new component
> in isolation, tasks 3–5 wire it in, task 6 cleans up.

## 1. Extract a shared "floating panel" style token

`MindMapOutline` and `NodeEditorCard` will share visual DNA:
position, width strategy, height cap, z-index, border, shadow,
background, transition. Lock the shared classes into one
constant so future in-canvas panels inherit them for free.

- [ ] 1.1 In `src/features/mindmap/`, decide where the shared
  classes live. Recommended: a small
  `src/features/mindmap/floatingPanelClasses.ts` exporting
  `FLOATING_PANEL_BASE_CLASSES`, `FLOATING_PANEL_OPEN_CLASSES`,
  `FLOATING_PANEL_CLOSED_CLASSES` as plain `string`s.
- [ ] 1.2 Update `MindMapOutline.tsx` to consume the shared
  constants instead of inlining the class string. Visually
  identical (snapshot test must pass without changes).
- [ ] 1.3 Add a unit test
  `src/features/mindmap/__tests__/floatingPanelClasses.test.ts`
  that asserts the constants are non-empty strings and that
  `OPEN_CLASSES` contains `opacity-100` while `CLOSED_CLASSES`
  contains `pointer-events-none`.

## 2. Build `NodeEditorCard`

A new component that contains **only** the editor form body
(label, summary, content-type switcher, toolbar, edit / split /
preview switcher, footer with cancel / confirm). It owns local
form state and emits a single `onConfirm` callback. It does
**not** manage the open / close animation — the parent passes
`open` and the card handles the visual transition.

- [ ] 2.1 Create `src/features/mindmap/NodeEditorCard.tsx` with
  the props:

  ```ts
  interface NodeEditorCardProps {
    node: MindMapNode
    open: boolean
    onConfirm: (nodeId, label, summary, content?, contentType?) => void
    onCancel: () => void
  }
  ```

- [ ] 2.2 Wrap the entire form in
  `<aside role="dialog" data-testid="node-editor-card" className={FLOATING_PANEL_BASE + open ? OPEN : CLOSED}>`
  (mirroring `MindMapOutline`'s wrapper structure).
- [ ] 2.3 Move the form state hooks (`useState` for label /
  summary / content / contentType / viewMode), the
  `useEffect` that resets state on `node.id` change, the
  `applyAction` callback, the `handleContentKeyDown` callback,
  and the `previewHtml` memo out of
  `MindMapEditModal.tsx` into `NodeEditorCard.tsx` **verbatim**
  (same logic, same sanitiser calls, same shortcut wiring).
- [ ] 2.4 The header reads `编辑: <truncate node.label>` (vs.
  the modal's "编辑节点" generic title). Truncate at 32
  characters with a `title={node.label}` tooltip for the full
  string.
- [ ] 2.5 The footer renders `取消` and `确认` buttons,
  `sticky bottom-0 bg-popover`, mirroring the modal's
  `flex justify-end gap-2 pt-1` layout.
- [ ] 2.6 **Do not** carry over `createPortal(...)`,
  `document.body.style.overflow = 'hidden'`, the `fixed inset-0`
  wrapper, the backdrop `div`, or the resize handle. These are
  modal-only and have no place in the in-canvas card.
- [ ] 2.7 Add a `data-testid="node-editor-card"` to the outer
  `<aside>` and `data-testid="node-editor-cancel"` /
  `data-testid="node-editor-confirm"` to the footer buttons.
  Match the test ids the existing
  `MindMapEditModal.test.tsx` already uses
  (`data-testid="mindmap-edit-modal"` is replaced — see
  task 6.3).
- [ ] 2.8 Create `src/features/mindmap/__tests__/NodeEditorCard.test.tsx`
  by copying `MindMapEditModal.test.tsx` and:
  - Replace `import MindMapEditModal` with
    `import NodeEditorCard`.
  - Add `open={true}` to every render call (the new card
    uses `open` for the transition; the test should always
    render the open state).
  - Update `data-testid` queries to
    `node-editor-card` / `node-editor-cancel` /
    `node-editor-confirm`.
  - **Drop** the two body-scroll-lock tests
    (`'MindMapEditModal — body scroll lock'` describe block) —
    the card does not lock body scroll, so the tests are no
    longer applicable.
  - **Drop** the two resize-handle tests
    (`'MindMapEditModal — resize handle'` describe block) —
    the card has no resize handle, so the tests are no longer
    applicable.
  - All other describe blocks (content-type switching,
    confirm / cancel, toolbar insertAtCursor in HTML and
    markdown, markdown preview) carry over unchanged.
- [ ] 2.9 Run `npm test -- NodeEditorCard` and confirm green
  in isolation.

## 3. Mutual exclusion in `MindMapPanel`

`MindMapPanel` owns `drawerOpen` and `outlineOpen` today; it
will own a new `editorOpen` and a new `editorNodeId`.

- [ ] 3.1 In `src/features/mindmap/MindMapPanel.tsx`, add
  `const [editorOpen, setEditorOpen] = useState(false)` and
  `const [editorNodeId, setEditorNodeId] = useState<string | null>(null)`.
- [ ] 3.2 Add a single `openEditor(nodeId: string)` callback
  that atomically:
  - `setEditorNodeId(nodeId)`
  - `setEditorOpen(true)`
  - `setOutlineOpen(false)`
- [ ] 3.3 Add a `closeEditor` callback that sets
  `editorOpen = false` and `editorNodeId = null`. The card's
  `onCancel` and the `Esc` handler both call this.
- [ ] 3.4 In the existing outline toolbar toggle (line ~287
  today), wrap the toggle in:
  - If `editorOpen` is true: call `closeEditor` then
    `setOutlineOpen(true)` (treat the click as "switch to
    outline").
  - Else: keep the current `setOutlineOpen(o => !o)` behaviour.
- [ ] 3.5 Pass `editorOpen`, `onEditorOpen` (the callback from
  3.2), `onEditorClose` (the callback from 3.3) down to
  `<MindMapTree />` as new props.
- [ ] 3.6 In `MindMapTree.tsx`, extend the props interface with
  the three new fields and forward them to where the editor
  card is mounted (see task 4).
- [ ] 3.7 Update `MindMapPanel.test.tsx` and any existing
  `MindMapTree.test.tsx` host wrappers (e.g. `TreeHost` in
  `MindMapTree.test.tsx:112`) to supply the three new props
  with the safe defaults
  `editorOpen={false} onEditorOpen={() => {}} onEditorClose={() => {}}`
  so existing tests do not regress.

## 4. Wire `NodeEditorCard` into `MindMapTree`

- [ ] 4.1 In `src/features/mindmap/MindMapTree.tsx`, remove
  `const [editNode, setEditNode] = useState<MindMapNode | null>(null)`
  (line 80 today) and all six of its `setEditNode(...)` call
  sites (lines 285, 406, 869, 886; plus the read in the
  `useMindmapHotkeys` enabled-flag at line 705).
- [ ] 4.2 Replace the read in the hotkey enabled-flag
  (`editNode === null`) with `editorOpen === false` (now
  derived from the new prop).
- [ ] 4.3 Replace the `<MindMapEditModal />` render block
  (lines 865–871) with:
  ```tsx
  {editorNodeId && (
    <NodeEditorCardMount
      nodeId={editorNodeId}
      open={editorOpen}
      onConfirm={handleEditConfirm}
      onCancel={onEditorClose ?? (() => {})}
    />
  )}
  ```
  where `NodeEditorCardMount` is a small local helper that
  looks the node up via `findNodeInTree(tree, nodeId)` and
  renders `<NodeEditorCard node={found} ... />`, returning
  `null` if the node was deleted between the open and the
  next render. This keeps the same "render-time lookup"
  pattern the modal used (`editNode` was a captured `MindMapNode`
  snapshot).
- [ ] 4.4 In `MindMapContextMenu`'s `onEdit` handler
  (currently at `MindMapTree.tsx:884–888`), replace
  `setEditNode(found)` with `onEditorOpen(found.id)` and
  `setContextMenu(null)`.
- [ ] 4.5 In `MindMapTree.tsx`, find the function that handles
  the `useMindmapHotkeys` `edit` action (line ~285) and
  replace its `setEditNode(found)` with
  `onEditorOpen(found.id)`.

## 5. Double-click on a node → open editor

> **Implementation note (2026-06-08)**: the double-click
> handler is **already wired** through React Flow's
> `onNodeDoubleClick` event system, not through a DOM
> `onDoubleClick` on `BaseNode`. The handler at
> `MindMapTree.tsx:290–301` (`handleNodeDoubleClick`) was
> already called by `FlowShell`'s `onNodeDoubleClick` prop
> (Stage A1 §10). The pre-existing tooltip
> "编辑此节点（双击节点）" on the context menu was
> *already accurate* — it just needed the handler to be
> pointed at the new editor state path, which the change in
> task 4 accomplished. No `BaseNode` / `RectCardNode`
> changes are required.

- [x] 5.1 Verify the existing `handleNodeDoubleClick` in
  `MindMapTree.tsx` (lines 290–301 post-change) routes into
  `onEditorOpen?.(node.id)` instead of the removed
  `setEditNode(found)`. **Done in task 4.**
- [x] 5.2 Confirm React Flow's pane-double-click handler
  (which calls `fitView`, per Stage A1 §10) is **not**
  triggered by double-clicking a node. Verified: the pane
  handler is attached to the pane element by React Flow
  itself, and a node sits on top of the pane — React Flow
  routes `onNodeDoubleClick` to the node callback before
  the pane sees the event. No `stopPropagation` is needed
  in our handler.
- [x] 5.3 Add a test
  `MindMapTree > routes node double-click into onEditorOpen(nodeId)`
  in `__tests__/MindMapTree.test.tsx` (the FlowShell mock
  exposes a button whose `onDoubleClick` invokes the
  captured `onNodeDoubleClick` prop with a `{ id: 'root' }`
  node). **Done in task 4.**

## 6. Clean up: delete `MindMapEditModal`

- [ ] 6.1 Confirm there are no remaining imports of
  `MindMapEditModal` outside `MindMapTree.tsx`
  (`grep -r "MindMapEditModal" src/`).
- [ ] 6.2 Delete `src/features/mindmap/MindMapEditModal.tsx`.
- [ ] 6.3 Delete
  `src/features/mindmap/__tests__/MindMapEditModal.test.tsx`.
- [ ] 6.4 In
  `src/features/mindmap/__tests__/MindMapTree.test.tsx`,
  update the top-of-file mock
  (`vi.mock('../MindMapEditModal', () => ({ default: () => null }))`)
  to mock `NodeEditorCard` instead, with the same `() => null`
  stub. The rest of the test file is unchanged.
- [ ] 6.5 Run `npm run lint && npm test && npm run build` and
  confirm green end-to-end.
- [ ] 6.6 Update `AGENTS.md` to reflect that
  `MindMapEditModal` is gone and `NodeEditorCard` is the
  single entry point for in-canvas node editing. (The change
  is a one-line entry in the `Architecture` section.)
