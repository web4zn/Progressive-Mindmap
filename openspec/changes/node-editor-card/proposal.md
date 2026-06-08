# Node Editor — move to in-canvas card (align with Outline)

> Replaces the centered `MindMapEditModal` with an in-canvas
> floating card (`NodeEditorCard`) that mirrors the position and
> visual treatment of `MindMapOutline`. The editor stops taking
> over the viewport with a backdrop, the canvas stays interactive
> while editing, and the experience matches the "immersive
> floating panel" feel that Outline already delivers. Also wires
> up the long-promised "double-click a node to edit" affordance
> and makes `MindMapContextMenu`'s "编辑此节点" entry the
> single-source-of-truth trigger.

## Why

After Stage C / D, the mindmap canvas has a polished in-canvas
outline that docks at the top-right corner as a floating card
(`absolute top-3 right-3 z-40 w-64`, `bg-popover`, `shadow-md`,
sliding-in / fading-out transition). The user expectation set by
that outline is "right-side panels live *inside* the canvas
frame, not as screen-level overlays." The current node editor
breaks that promise:

- `MindMapEditModal` is a **centered, screen-locking dialog**
  (`fixed inset-0` + `backdrop-blur` + `body.style.overflow = 'hidden'`).
  It paints over the entire viewport, hides the canvas, and
  forbids the user from panning / zooming while editing. The
  "shape" of a node (position, siblings, ancestors) is therefore
  invisible at the moment the user is most likely to want it —
  while they are editing that node's content.
- The `MindMapContextMenu` "编辑此节点" entry has a misleading
  `title` attribute that says "双击节点" (double-click a node),
  but no double-click → edit handler is wired up anywhere in the
  code. The promise is broken at the implementation level.
- The modal's resize handle (drag the bottom-right corner) is
  dead weight inside an in-canvas card — the user can't make the
  card wider than its host, so the resize affordance is noise.
- "Centered modal" + "in-canvas outline" are two conflicting
  visual models for right-side panels. Users get one rule for
  outline (canvas-local) and a different one for editor
  (screen-global) for no good reason.

This change collapses them into one rule: **everything that
floats against the right edge of the canvas uses the same card
pattern as `MindMapOutline`.**

## What Changes

### 1. New component `NodeEditorCard` (in-canvas, top-right)

A new file `src/features/mindmap/NodeEditorCard.tsx` renders the
node editor as a floating card anchored to the canvas's
top-right corner. Position, width, height cap, z-index, shadow,
border, and slide-in / fade-in transition are taken verbatim
from `MindMapOutline` (which is the proven, accepted pattern in
this codebase). The body of the card contains the same form
that `MindMapEditModal` exposes today: label, summary, content
type switcher (text / HTML / markdown), toolbar (B / I / H1–H4 /
lists / code / link / image / table / quote), and the
edit / split / preview view-mode switcher.

Card dimensions:

- `w-[420px]` on viewports ≥ 1024px
- `w-[min(420px,calc(100vw-24px))]` on viewports < 1024px
- `max-h-[calc(100%-24px)]` so the card reaches the canvas
  bottom minus 12px on top and bottom
- Internal form body is its own scroll container
  (`overflow-y-auto`); the header, toolbar, and footer are
  sticky

Card behaviour (preserved from the modal):

- ⌘B / ⌘I shortcuts inside the content textarea
- Esc closes the card (document-level keydown, mirrors
  `MindMapOutline` and `MindMapDrawer`)
- Closing the card without confirming **discards** local edits
- Confirming writes through `mindmapStore.updateNode` and
  closes
- Focus auto-lands on the "名称" input and selects its
  contents on open
- Switching to a different node while the card is open
  **resets** the local form state (matches today's modal
  behaviour — see the `useEffect` keyed on `node.id` in
  `MindMapEditModal.tsx:233–246`)

Card behaviour (removed vs. the modal):

- **No** `body.style.overflow = 'hidden'`. The canvas stays
  pannable / zoomable while the card is open.
- **No** `fixed inset-0` backdrop. There is no scrim.
- **No** resize handle. Width is fixed by the card pattern;
  height is governed by `max-h-[calc(100%-24px)]` plus
  internal scrolling.
- **No** `createPortal(...)`. The card renders inline inside
  the canvas's `position: relative` wrapper, the same place
  `MindMapOutline` renders.

### 2. Mutual exclusion: Outline ↔ Editor (strict)

Both cards anchor to `top-3 right-3` of the canvas. They cannot
both be visible at the same time. `MindMapPanel` owns the
state machine and enforces:

- Opening the editor (`setEditorOpen(true)`) closes the
  outline (`setOutlineOpen(false)`) atomically.
- Opening the outline (toggle button) closes the editor
  (`setEditorOpen(false)`) atomically.
- The header of the outline card gets a small "edit" affordance
  (a `Pencil` icon button) that, when clicked, closes the
  outline and opens the editor for the *currently selected*
  node (or the first node of the active mindmap if no node is
  selected). This is the only way the user can "switch" between
  the two cards via UI, beyond closing one and toggling the
  other from the toolbar.

The card's transition (`opacity-100 translate-y-0` ↔
`opacity-0 -translate-y-2`) is unchanged. A user who toggles
quickly will see one card fade out while the other fades in.

### 3. Drawer ↔ Editor (no mutual exclusion)

The associated-conversations drawer (`MindMapDrawer`,
screen-level right-side drawer, `w-80`) is on a different
visual layer (it lives outside the canvas's `position: relative`
wrapper, in the `MindMapPanel` body). It does not visually
collide with the in-canvas card, and it remains reachable
while the editor is open.

No state coupling between the drawer and the editor is
introduced. Both can be open at the same time, and either can
be closed / reopened without affecting the other.

### 4. Double-click on a node → open editor

`BaseNode` (and its concrete `RectCardNode`) currently has no
`onDoubleClick` handler. The `MindMapContextMenu`'s
`title="编辑此节点（双击节点）"` attribute is a
not-yet-implemented promise. This change closes the gap by
wiring `onDoubleClick` on every node so that:

- Double-clicking a node's body or icon triggers the same
  `onOpenEditor(nodeId)` callback that the context menu's
  "编辑此节点" entry triggers.
- Double-clicking a node does **not** propagate to
  `<ReactFlow>`'s pane-double-click handler, which calls
  `fitView` (Stage A1 §10, commit `bda78e1`). `event.stopPropagation()`
  in the node handler is sufficient — React Flow's pane
  handler is only attached to the pane itself, and the node
  sits on top of the pane.
- The misleading "双击节点" tooltip on the context menu entry
  is preserved (it is now accurate). No copy change.

### 5. `MindMapEditModal` removal

After `NodeEditorCard` lands and tests pass, `MindMapEditModal.tsx`
and `MindMapEditModal.test.tsx` are deleted. The only call site
is `MindMapTree.tsx:865–871`, which is updated to render
`<NodeEditorCard />` instead.

`MindMapTree.test.tsx`'s top-of-file mock
(`vi.mock('../MindMapEditModal', ...)`) is updated to mock
`NodeEditorCard` with the same `() => null` stub.

## Out of scope (explicit)

- No new node fields, no schema changes, no store shape
  changes. `mindmapStore.updateNode` is the same call.
- No changes to `MindMapDrawer` (associated conversations
  drawer) — its component file, tests, and call sites are
  untouched.
- No changes to `MindMapOutline`'s tree-walking logic, search,
  focus behaviour, or collapse state.
- No changes to the toolbar layout, `useMindmapHotkeys`, the
  context menu, or any Stage A / B / C / D behaviour.
- No theming or CSS-variable additions beyond reusing the
  tokens `MindMapOutline` already uses
  (`bg-popover text-popover-foreground border-border shadow-md`).
- No Electron / desktop shell changes.

## Risks

- **Card width vs. canvas width on small viewports.** A 420px
  card on a 768px-wide canvas leaves only ~340px for the
  canvas. The card is capped at `min(420px, calc(100vw-24px))`
  so it never bleeds past the canvas edge, but on a 768px
  viewport it will visually dominate. Mitigated by
  acknowledging in the spec that the card is most useful at
  ≥ 1024px and the user can scroll the canvas horizontally
  underneath it.
- **The misleading "双击节点" tooltip is finally accurate.**
  Users who read the tooltip and try double-clicking today
  will get no response. Once this change lands the response
  exists. The tooltip is not changed in this change; the
  pre-existing UX debt is retired.
- **Two open animations at once if a user toggles quickly.**
  The strict mutual exclusion is implemented as
  `setEditorOpen(true); setOutlineOpen(false)` (in either
  order). React batches these in the same render, so the
  outgoing card starts fading out the same frame the
  incoming card starts fading in. Visually clean.

## Verification

- `npm run lint` clean
- `npm test` — full suite green, including the new
  `NodeEditorCard.test.tsx` and the migrated test cases
- `npm run build` clean
- Manual smoke: open outline + open editor quickly via toolbar
  + double-click a node + double-click a different node while
  the editor is open + close via Esc + close via X button +
  confirm writes through to the canvas
