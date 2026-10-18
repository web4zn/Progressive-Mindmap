# Tasks — node position pinning

Legend: `[ ]` pending · `[x]` done.

## 1. Change scaffolding

- [x] `proposal.md` + `tasks.md` + spec deltas (`mindmap-drag-reparent`,
      `mindmap-canvas-rendering`).
- [x] `npx openspec validate fix-node-position-pinning --strict` passes, and
      `npx openspec validate --specs --strict` still reports 27 passed (the
      change folder is not a spec, so it must not disturb that count).

## 2. Store

- [x] `src/stores/mindmapStore.ts`: new `setNodePosition(mindmapId, nodeId,
      position | null)` — pins `MindMapNode.position`, or drops the field on
      `null`; deliberately does not touch `editedByUser` (layout is not
      content, unlike `resetNodePosition`).
- [x] `src/stores/mindmapStore.ts`: new `setNodePositions(mindmapId, updates)`
      batch action so a dragged branch is pinned in a single store write.

## 3. Flow data and layout

- [x] `src/lib/mindmap-flow.ts` `treeToFlowShell`: emits
      `position: node.position ?? { x: 0, y: 0 }` and `pinned: node.position
      !== undefined` on the flow node data.
- [x] `src/components/flow-shell/index.ts`: `FlowNodeData.pinned?: boolean`
      declared.
- [x] `src/components/flow-shell/canvas/flowShellUtils.ts`
      `applyDagreLayout`: a pinned node keeps its coordinates (and is sized)
      instead of receiving dagre's answer; unpinned nodes are still placed by
      dagre.

## 4. Drag semantics

- [x] `src/lib/mindmap-drag.ts`: `pickReparentTarget(intersectingIds, draggedId,
      draggedNode, oldParentId)` extracted — skips the dragged node, its
      current parent and its descendants.
- [x] `MindMapTree.handleNodeDragStop` uses `pickReparentTarget`; a valid
      target re-parents (unchanged) and clears any stale pin on the dragged
      node so the layout can place it under the new parent.
- [x] `MindMapTree.handleNodeDragStop`: no valid target (empty canvas, or the
      current parent) pins the released coordinates via `setNodePosition`,
      recorded in the undo history — no implicit detach-to-root.
- [x] `MindMapContextMenu` "提升为根节点" entry (`hasParent` gated,
      `data-testid="mindmap-context-promote-to-root"`) reparents the node to
      root and clears its pin, replacing the old drag side effect.
- [x] `FlowShell` / `CanvasLayout` gained `onNodeDragStart` and a
      `getNodes()` handle method, so the drop can compute the drag delta and
      read the live positions of the dragged node's descendants.
- [x] Dragging a branch moves the whole branch: `collectSubtreeIds()` +
      `setNodePositions()` pin the dragged node and every rendered descendant
      by the same delta; collapsed (unrendered) descendants are skipped and
      fall back to dagre on expand.

## 5. Tests and version

- [x] `src/stores/__tests__/mindmapStore.test.ts`: pins without setting
      `editedByUser`, clears on `null`, survives an unrelated tree update.
- [x] `src/lib/__tests__/mindmap-flow.test.ts`: pinned node carries its stored
      position and `data.pinned === true`; unpinned node starts at
      `{ x: 0, y: 0 }` with `data.pinned === false`.
- [x] `src/components/flow-shell/__tests__/canvas-utils.test.ts`: pinned node
      keeps its coordinates while unpinned nodes are laid out; pinned nodes are
      still sized; inputs are not mutated.
- [x] `src/lib/__tests__/mindmap-drag.test.ts`: `pickReparentTarget` skip /
      re-parent cases, including drop back onto the current parent;
      `collectSubtreeIds` depth-first ordering.
- [x] Version bump `1.0.5` → `1.0.6` in `package.json` and `package-lock.json`
      (patch, per the AGENTS.md release rule).

## 6. Verification (Lead)

- [x] `npx tsc --noEmit` (renderer) + `npx tsc --noEmit -p
      electron/tsconfig.json` → 0 errors.
- [x] `npx eslint .` → 0 errors (7 pre-existing warnings unchanged).
- [x] `npx vitest run` → 46 files / 531 tests pass, including the four pinning
      test files listed in §5.
- [x] `npm run build` → electron-vite production build passes.
- [ ] Manual / E2E check: drag a node onto empty canvas → it stays at the
      dropped spot after a reload and after an unrelated structural change;
      "重置位置" now appears for it and hands the node back to dagre;
      "提升为根节点" appears only for nodes with a parent and detaches them;
      dragging a node onto another node still re-parents.
- [x] Re-run `npx openspec validate fix-node-position-pinning --strict` after
      the final code state lands.
