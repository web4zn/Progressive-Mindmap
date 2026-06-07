# Mindmap UI — Stage C (interaction enhancements)

> Locked snapshot of the Stage C OpenSpec (commit 0cda8a1). This
> file exists so the spec archive has a stable entry for the
> Stage C work; the live contract lives in the source code
> (e.g. `MindMapTree`, `useMindmapHotkeys`, `MindMapContextMenu`).

## ADDED Requirements

### Requirement: Hover path highlight

When the user hovers a node, the canvas SHALL dim every node
that is not on the hovered node's ancestor chain, plus every
edge that does not connect two nodes on the chain. Edges whose
both endpoints are in the dim set SHALL be marked
`.react-flow__edge.dimmed`; nodes SHALL be marked
`.flow-node.dimmed` (50% opacity).

The dim transition SHALL complete in 200 ms (use the
`--duration-base` token).

#### Scenario: Hover a depth-3 node
- **WHEN** the user hovers any node at depth ≥ 1
- **THEN** the root + the node + every ancestor between them stay
  at 100% opacity; all other nodes drop to 30% opacity; edges
  outside the path drop to 15% opacity

### Requirement: Edge hover

When the user hovers a React Flow edge, the two endpoints
SHALL stay at 100% opacity and the edge itself SHALL stay at
100%; everything else dims. Edge hover wins over node hover.

#### Scenario: Hover an edge
- **WHEN** the user hovers the edge between `a` and `a1`
- **THEN** `a`, `a1`, and the edge stay at 100%; every other
  node + edge dims

### Requirement: Streaming shimmer

Nodes at depth < 3 SHALL carry the `.flow-node.streaming` class
when the parent reports `isStreaming=true`. The class triggers a
diagonal light sweep (2 s linear infinite, `flow-shimmer`
keyframe). The animation is suppressed under
`prefers-reduced-motion: reduce`.

### Requirement: Top-bar undo / redo

The panel header SHALL expose undo (↶) / redo (↷) buttons that
read `canUndo` / `canRedo` from a lifted `useMindmapHistory`
hook. Pressing ↶ SHALL call `history.undo()` and replace the
active mindmap's `tree` with the previous snapshot.

The history is keyed on `activeMindmapId` — switching mindmaps
clears the timeline.

### Requirement: Outline drawer

The panel SHALL expose a left-side outline drawer (button in
the top-bar) that lists every node as a flat indented list.
Clicking an entry SHALL call `flowShellRef.focusNode(id)`.

### Requirement: Search box

A search box in the top-bar SHALL match node label / summary /
content (case-insensitive substring). Matching nodes receive
`.flow-node.search-match` (2 px outline + box-shadow halo);
non-matching nodes are dimmed.

#### Scenario: Press Enter on a search query
- **WHEN** the user types a query and presses Enter
- **THEN** the canvas focuses the first match (via the
  `flowShellRef.focusNode` bridge)

### Requirement: Filter dropdown

A filter dropdown SHALL let the user restrict the canvas to:
- a set of patterns (multi-select),
- a max depth (1–N or 0 = "any"),
- "only edited by user" toggle.

The filter runs as a "hide non-matching" pass on the tree
before collapse-pruning. Collapsed state takes priority over
filter — a collapsed node's children never reach the canvas
regardless of the filter.

### Requirement: Background switcher

A 3-icon segmented control SHALL let the user pick the canvas
background: `点阵` (dots), `网格` (grid), `无` (none). The
choice is component-level state, not persisted.

### Requirement: Keyboard navigation

The canvas SHALL respond to:
- `Ctrl/⌘ + F` → focus the search box
- `Ctrl/⌘ + Z` / `Ctrl/⌘ + Shift + Z` → undo / redo
- Arrow keys on a selected node → move to the nearest node in
  that direction (via `nearestNodeInDirection`)
- `Tab` / `Shift + Tab` → next / previous node (via
  `tabJumpInTree`)
- `Delete` → confirm-delete the selected node
- `Escape` → close any open modal / context menu

### Requirement: Touch long-press

A long-press (800 ms) on a touch device SHALL open the context
menu. Implemented via a `useLongPress` hook attached to the
canvas wrapper.

### Requirement: MiniMap viewport rectangle

The custom MiniMap SHALL render a translucent rectangle that
mirrors the current React Flow viewport, so the user can see
"what's on screen" vs. the rest of the graph. Clicking the
MiniMap SHALL move the viewport so the clicked point becomes
the centre.

## Impact

- **UI**: new top-bar buttons (undo/redo/outline), new search
  box, new filter dropdown, new background switcher, new
  outline drawer, new MiniMap viewport indicator, new keyboard
  shortcuts, new touch long-press handler.
- **State**: a new `useMindmapHistory` hook (lifted to
  `MindMapPanel`) keyed on `activeMindmapId`.
- **Data model**: unchanged.
