# Pin dragged node positions instead of discarding them

> Layout-persistence fix. No data-model or UI redesign: the node field, the
> store action and the context-menu entry already existed — only the write path
> was missing.

## Why

`MindMapNode.position` (`src/types/mindmap.ts`), `mindmapStore.resetNodePosition`
and a "重置位置" context-menu entry gated on `hasPinnedPosition`
(`src/features/mindmap/MindMapTree.tsx`) all existed — but **nothing ever wrote
the field**. Symptoms:

- A node dragged to a nicer spot snapped back to dagre's answer on the next
  structural change and was gone after a reload: only the in-memory React Flow
  node moved, `MindMapNode.position` stayed `undefined`.
- "重置位置" could never appear, because `hasPinnedPosition` read a field that
  was always `undefined`.
- Dragging onto empty canvas silently detached the node to root level (an
  undocumented re-parent), so drag could not reposition a node at all.

## What Changes

### 1. Store actions

`src/stores/mindmapStore.ts` gains
`setNodePosition(mindmapId, nodeId, position | null)`: pins a node to flow
coordinates, or clears the pin with `null` by dropping the field entirely.
Unlike `resetNodePosition` it does not touch `editedByUser` — layout is not
content. A companion `setNodePositions(mindmapId, updates)` writes a whole
branch in one store update.

### 2. Flow node data carries the pin

`treeToFlowShell` (`src/lib/mindmap-flow.ts`) emits
`position: node.position ?? { x: 0, y: 0 }` and sets a `pinned: boolean` flag on
the flow node data (`FlowNodeData.pinned`, `src/components/flow-shell/index.ts`).

### 3. Layout honours the pin

`applyDagreLayout` (`src/components/flow-shell/canvas/flowShellUtils.ts`) runs
dagre for the whole graph as before but discards dagre's answer for a pinned
node: the node keeps its stored coordinates (and is still sized). Unpinned
nodes are still placed by dagre.

### 4. Drag semantics

`MindMapTree.handleNodeDragStop`:

- drop onto another eligible node → re-parent (unchanged), and any stale pin on
  the dragged node is cleared so the layout can place it under the new parent;
- drop onto empty canvas (or back onto the current parent) → **pin** the node
  where it was released, recorded in the undo history. Dragging a branch pins
  the whole branch: the drop reads the live positions of the node's rendered
  descendants through the new `FlowShellHandle.getNodes()` and the drag delta
  captured in `onNodeDragStart`, then writes them all with
  `setNodePositions()`; collapsed (unrendered) descendants are skipped.

The eligibility rule is extracted to `pickReparentTarget()`
(`src/lib/mindmap-drag.ts`): skips the dragged node itself, its current parent
(dropping back onto the parent is a reposition, not a re-parent) and its
descendants (would create a cycle).

### 5. Promote to root moves to the context menu

Dragging onto empty canvas used to detach the node to root level. That
(undocumented) capability is now explicit: a "提升为根节点" context-menu entry
(`hasParent` gated, `data-testid="mindmap-context-promote-to-root"`) reparents
the node to root and clears its pin, so nothing is lost.

### 6. Tests and version

Unit tests for the store action, the flow conversion, the pinned layout and
`pickReparentTarget`; version `1.0.5` → `1.0.6`.

## Non-goals

- Group / marquee repositioning or multi-node drag.
- Specifying pin coordinates as node content: `position` remains a pure layout
  hint, never edited in the node editor and never set by the Agent.
- Letting a drag override dagre for the whole graph — only pinned nodes opt
  out, everything else stays automatic.
- A data migration or DB-version bump: `position` is an optional field on
  existing types, and old mindmaps load unchanged (all nodes unpinned).
- Resetting pins automatically when a node is deleted / re-generated; only the
  explicit actions above clear them.

## Capabilities

### Modified Capabilities

- `mindmap-drag-reparent` — drag onto a node still re-parents, while drag onto
  empty canvas now pins the dropped coordinates instead of detaching the node
  to root; promoting to root moves to a context-menu entry. The
  "Drag node to reparent" requirement is restated.
- `mindmap-canvas-rendering` — new requirement: pinned node positions
  (`MindMapNode.position`) are honoured by the layout, while unpinned nodes are
  still placed by dagre and clearing a pin returns the node to dagre.

## Impact

- Files: `src/stores/mindmapStore.ts` (`setNodePosition`),
  `src/lib/mindmap-flow.ts` (`treeToFlowShell` position + `pinned`),
  `src/components/flow-shell/index.ts` (`FlowNodeData.pinned`),
  `src/components/flow-shell/canvas/flowShellUtils.ts` (`applyDagreLayout` keeps
  pinned coordinates), new `src/lib/mindmap-drag.ts` (`pickReparentTarget`),
  `src/features/mindmap/MindMapTree.tsx` (drag-stop semantics, promote-to-root
  handler), `src/features/mindmap/MindMapContextMenu.tsx` ("提升为根节点"
  entry + `hasParent`), `package.json` / `package-lock.json` (version),
  `AGENTS.md` (drag semantics note).
- Version bumped `1.0.5` → `1.0.6` (patch: bug fix that ships code, per
  `AGENTS.md`).
- Tests: `src/stores/__tests__/mindmapStore.test.ts` (`setNodePosition`),
  `src/lib/__tests__/mindmap-flow.test.ts` (pin carried onto the flow node),
  `src/components/flow-shell/__tests__/canvas-utils.test.ts` (pinned nodes keep
  their coordinates), new `src/lib/__tests__/mindmap-drag.test.ts`
  (`pickReparentTarget`).
- Persisted data: additive optional `position` only; no DB version bump, no
  migration. Mindmaps created before this change render exactly as before (no
  node is pinned).
