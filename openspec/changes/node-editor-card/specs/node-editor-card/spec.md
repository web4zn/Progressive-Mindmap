# Node Editor Card

> Replaces `MindMapEditModal` (centered, screen-locking dialog)
> with `NodeEditorCard` (in-canvas floating card, top-right,
> aligned with `MindMapOutline`). Adds the long-promised
> "double-click a node to edit" affordance. Enforces strict
> mutual exclusion between the editor and the outline.

## ADDED Requirements

### Requirement: In-canvas editor card

The mindmap feature SHALL expose node editing through a
floating card (`NodeEditorCard`) anchored to the canvas's
top-right corner. The card SHALL:

- Be positioned `absolute top-3 right-3` inside the canvas's
  `position: relative` wrapper, identical to
  `MindMapOutline`.
- Render at `width: 420px` on viewports ≥ 1024px and at
  `width: min(420px, calc(100vw - 24px))` on viewports
  < 1024px.
- Cap its height at `max-h-[calc(100%-24px)]` and let its
  internal form body scroll when content overflows.
- Use the same `bg-popover text-popover-foreground
  border-border shadow-md` styling and the same
  `transition-all duration-200 ease-out` animation that
  `MindMapOutline` uses.
- Show the header `编辑: <node.label>` (label truncated to
  32 characters with a `title` tooltip carrying the full
  string).
- NOT render a `fixed inset-0` backdrop.
- NOT set `document.body.style.overflow = 'hidden'`.
- NOT expose a resize handle.
- NOT use `createPortal(...)` — it renders inline inside
  the canvas wrapper.

#### Scenario: Open the editor from the context menu
- **WHEN** the user right-clicks a node and selects
  "编辑此节点"
- **THEN** the editor card slides in at the canvas's
  top-right corner with the selected node's data loaded
  into the form

#### Scenario: Open the editor by double-clicking a node
- **WHEN** the user double-clicks a node on the canvas
- **THEN** the editor card opens for that node, identical
  to opening it via the context menu

#### Scenario: The card does not block the canvas
- **WHEN** the editor card is open
- **THEN** the user can still pan, zoom, and click on other
  nodes in the canvas (no `body` scroll lock, no
  pointer-event blocking of the canvas surface)

#### Scenario: Closing the card discards unsaved edits
- **WHEN** the user has typed changes into the form and
  then closes the card via Esc / X / 取消
- **THEN** the changes are discarded and the node retains
  its pre-edit data

#### Scenario: Confirming the card persists edits
- **WHEN** the user clicks 确认 in the editor card footer
- **THEN** the form values are written through
  `mindmapStore.updateNode` and the card closes

### Requirement: Strict mutual exclusion with the outline

`NodeEditorCard` and `MindMapOutline` SHALL NOT be visible
at the same time. The state machine owned by
`MindMapPanel` SHALL guarantee:

- Opening the editor closes the outline in the same render
  (atomic `setEditorOpen(true); setOutlineOpen(false)`).
- Opening the outline (via toolbar toggle, or via the
  outline's "edit" affordance) closes the editor in the
  same render.
- Toggling the outline toolbar button while the editor is
  open SHALL close the editor and open the outline
  (interpreted as "switch to outline", not as "toggle off
  then on").

#### Scenario: Outline → Editor
- **WHEN** the outline is open and the user opens the
  editor (via context menu or double-click)
- **THEN** the outline closes and the editor opens in the
  same render — only one card is visible at a time

#### Scenario: Editor → Outline
- **WHEN** the editor is open and the user clicks the
  outline toggle in the toolbar
- **THEN** the editor closes and the outline opens in the
  same render

#### Scenario: Rapid toggle
- **WHEN** the user toggles between outline and editor
  twice in quick succession
- **THEN** exactly one of the two cards is visible after
  the toggles settle (no stuck-open state)

### Requirement: Editor does not block the conversations drawer

The associated-conversations drawer (`MindMapDrawer`) and
`NodeEditorCard` SHALL be independent panels: opening or
closing one SHALL NOT affect the other. The two panels MAY
be visible at the same time.

#### Scenario: Drawer + Editor co-exist
- **WHEN** the editor is open and the user opens the
  associated-conversations drawer
- **THEN** the drawer slides in over the right edge of the
  viewport, the editor remains visible inside the canvas,
  and both can be closed / reopened independently

### Requirement: Double-click opens the editor

`BaseNode` (and any concrete node component) SHALL accept
an `onOpenEditor(nodeId: string)` callback and invoke it
on `onDoubleClick` of the node's clickable surface, with
`event.stopPropagation()` to prevent the React Flow
pane-double-click handler from also firing (the pane
handler calls `fitView`, per Stage A1 §10).

The misleading `title="编辑此节点（双击节点）"` on the
`MindMapContextMenu` entry is preserved unchanged — it is
now accurate.

#### Scenario: Double-click on a node
- **WHEN** the user double-clicks a node
- **THEN** `onOpenEditor(nodeId)` fires once, the editor
  card opens for that node, and the canvas does **not**
  re-fit (`fitView` is not called)

#### Scenario: Double-click on the canvas pane
- **WHEN** the user double-clicks an empty area of the
  canvas (not a node)
- **THEN** `fitView` is called, the editor is not opened,
  and the existing Stage A1 §10 behaviour is preserved

### Requirement: Editor and outline are reachable in every canvas state

`NodeEditorCard` SHALL be reachable in every branch of
`MindMapTree` that `MindMapOutline` is reachable in —
specifically: live (with `<FlowShell />`), error,
generating-but-not-streaming, and empty. This is achieved
by mounting the card inside the same `position: relative`
wrapper that mounts the outline.

#### Scenario: Editor reachable in error state
- **WHEN** the mindmap is in an error state and the user
  opens a node's context menu
- **THEN** the editor card opens at the top-right of the
  canvas area, identical to the live state

## REMOVED Requirements

### Requirement: Centered `MindMapEditModal` dialog

The `MindMapEditModal` component (centered dialog with
`fixed inset-0` backdrop, `body.style.overflow = 'hidden'`,
and a draggable resize handle) is removed. Its visual
treatment is replaced by `NodeEditorCard`.

#### Scenario: Legacy file is gone
- **WHEN** the change is applied
- **THEN** `src/features/mindmap/MindMapEditModal.tsx` and
  its test file do not exist, and no source file imports
  `MindMapEditModal`

## Out of scope

- No new node fields, no schema changes, no `mindmapStore`
  shape changes. `updateNode` is the only store entry point
  the card uses.
- No changes to `MindMapDrawer` (associated conversations
  drawer).
- No changes to `MindMapOutline`'s tree-walking, search,
  focus, or collapse behaviour.
- No changes to the toolbar layout, `useMindmapHotkeys`,
  the context menu, or any Stage A / B / C / D behaviour.
- No CSS-variable additions beyond reusing the tokens
  `MindMapOutline` already uses.
- No Electron / desktop shell changes.
