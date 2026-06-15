# Mindmap Drill-Down — Tasks

> 4 task blocks. Each block is a logical unit verifiable independently.
> **Store shapes, data models, dagre logic, and Electron code are out of scope and must not change.**

## 1. `drillNodeId` state + `effectiveTree` filtering

- [x] 1.1 In `MindMapTree.tsx`, add `const [drillNodeId, setDrillNodeId] = useState<string | null>(null)`
- [x] 1.2 Extend the `effectiveTree` `useMemo` to support `drillNodeId`:
  - When `drillNodeId === null`, return existing filtering result (no change)
  - When `drillNodeId !== null`, walk `tree` to find the node matching `drillNodeId`, return `[foundNode]` as single-root array
  - Use `findNodeInTree` from `mindmap-layout.ts` or inline DFS
- [x] 1.3 When `drillNodeId` is set, force the drill node's children to be visible regardless of `collapsedIds`:
  - In the `treeToFlowShell` call or in `effectiveTree`, treat the drill root's children as non-collapsed
  - Do NOT mutate `collapsedIds` in the store — just override in the render path
- [x] 1.4 When `drillNodeId` is cleared (set to `null`), the existing behaviour is fully restored

**交付物**：`drillNodeId` state wired into `effectiveTree` filter, children auto-expand on drill

---

## 2. DrillBreadcrumb component

- [x] 2.1 Create `src/components/flow-shell/DrillBreadcrumb.tsx`:
  - Props: `tree: MindMapNode[]`, `drillNodeId: string`, `onNavigate: (nodeId: string | null) => void`
  - Uses `findAncestorChain(tree, drillNodeId)` to get the path (`string[]`)
  - For each node ID, looks up the node in the tree to get its `label`
  - Renders: `[🏠 全部]` plus one segment per ancestor level, with `→` separator
  - Current node (last in chain) is highlighted but not clickable
  - `🏠 全部` clickable → calls `onNavigate(null)` (exit drill-down)
  - Intermediate ancestor segments clickable → calls `onNavigate(nodeId)` (re-drill at that level)
  - Renders `null` when `drillNodeId` is `null`
  - `data-testid="drill-breadcrumb"` on wrapper
  - `aria-label="下钻面包屑导航"` on wrapper
- [x] 2.2 Create `src/components/flow-shell/__tests__/DrillBreadcrumb.test.tsx`:
  - Renders nothing when `drillNodeId` is null
  - Renders correct breadcrumb chain for a 3-level path
  - Clears drill-down on `🏠 全部` click
  - Re-drills on intermediate segment click
  - Last segment is highlighted and non-clickable
- [x] 2.3 Mount `DrillBreadcrumb` in `MindMapTree.tsx`:
  - Render above FlowShell (same `position: relative` container)
  - Pass `tree` (full tree for path lookup), `drillNodeId`, and `setDrillNodeId` as `onNavigate`
  - Position: top of the container, z-index above FlowShell but below context menu

**交付物**：Functional breadcrumb component with tests, mounted in MindMapTree

---

## 3. Context menu integration

- [x] 3.1 Add `drillDown` to `MENU_ORDER` in `MindMapContextMenu.tsx`, positioned between `'center'` and `'duplicate'`
- [x] 3.2 Add `hasChildren: boolean` to `ContextMenuProps`
- [x] 3.3 Add `onDrillDown` to `ContextMenuProps` callback type
- [x] 3.4 Add `case 'drillDown'` to the menu action switch in `trigger()` → calls `onDrillDown()`
- [x] 3.5 Add `'drillDown'` to `MenuKey` union type
- [x] 3.6 Render the menu item:
  - Icon: `ZoomIn` from lucide-react (add to imports)
  - Label: `下钻到此`
  - `disabled={!hasChildren}` — greyed out and not clickable when node has no children
  - `data-testid="mindmap-context-drill-down"`
  - Title: `聚焦此节点及其子树`
  - Position: between "在画布居中" and "复制节点"
  - Only visible when `hasChildren` (not rendered at all for leaf nodes — per user spec)
- [x] 3.7 Wire the callback in `MindMapTree.tsx`:
  - Add `handleDrillDown = (nodeId: string) => { setDrillNodeId(nodeId); ... }` handler
  - Pass `onDrillDown` + `hasChildren` to `MindMapContextMenu`
  - Determine `hasChildren` from the clicked node (look up in tree or from React Flow node data)

**交付物**：「下钻到此」菜单项在非叶子节点上可用，点击触发下钻

---

## 4. Search + outline scope limitation

- [x] 4.1 In `MindMapTree.tsx`, when `drillNodeId` is set, pass `effectiveTree` (the drilled subtree) instead of full `tree` to `matchNodes()` for search:
  - `searchMatchNodeIds` memo reads `effectiveTree` instead of `tree` when drilling
  - The `searchQuery` prop/state remains unchanged
- [x] 4.2 In `MindMapTree.tsx`, when `drillNodeId` is set, pass `effectiveTree` to `MindMapOutline` instead of `activeMindmap?.tree`:
  - Add a `focusedTree` prop to `MindMapOutline` (or derive from drill state internally)
  - When `drillNodeId !== null`, Outline starts tree walk from `effectiveTree[0]`
  - When `drillNodeId === null`, Outline reads from `activeMindmap?.tree` as before
- [x] 4.3 Verify that exiting drill-down restores full-tree scope for both search and outline

**交付物**：下钻模式下搜索和大纲限定在当前子树范围

---

## 5. Verification

- [x] 5.1 `npm run build` — typecheck passes for our changes (pre-existing `AgentActivityPanel.tsx` error unrelated)
- [x] 5.2 `npm run lint` — clean for all new/modified files
- [x] 5.3 `npm test` — 491 tests pass (44 files), 14 new tests green, zero regressions
- [x] 5.4 Manual smoke test:
  - [x] 5.4.1 Open mindmap with multi-level tree, right-click a node with children → "下钻到此" visible and functional
  - [x] 5.4.2 After drilling, canvas shows only the focused subtree, dagre re-layouts with the new root
  - [x] 5.4.3 Breadcrumb shows correct path, clicking `🏠 全部` exits drill
  - [x] 5.4.4 Breadcrumb intermediate segment click re-drills at that level
  - [x] 5.4.5 Right-click a leaf node → "下钻到此" not visible
  - [x] 5.4.6 Initially collapsed node → after drilling, children are visible (auto-expanded)
  - [x] 5.4.7 Exit drill → collapsed state restored
  - [x] 5.4.8 Search in drill mode → only matches in subtree
  - [x] 5.4.9 Outline in drill mode → only shows subtree nodes
  - [x] 5.4.10 Refresh page → back to full tree view (no persistence)
