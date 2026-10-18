## Purpose

Defines how users reparent mindmap nodes by dragging them onto another node, including hit-testing on drop, the legality checks that prevent self-drops and circular references, and the persistence of the new hierarchy.
## Requirements
### Requirement: Drag node to reparent
系统 SHALL 允许用户通过拖拽将节点重新父子化。用户释放拖拽时，SHALL 通过
`onNodeDragStop` 与 React Flow 的 `getIntersectingNodes` 检测与拖拽节点相交的候选
目标。合法性 SHALL 由 `src/lib/mindmap-drag.ts` 的 `pickReparentTarget()` 统一判定：
不能放置到自身、不能放置到子孙节点（防止循环引用）、不能放置到当前父节点（放回父
节点属于「重新定位」，不是重新父子化）。验证通过后 SHALL 调用
`mindmapStore.reparentNode` 持久化变更并触发布局重算；若被拖拽节点带有旧的固定坐标，
SHALL 通过 `mindmapStore.setNodePosition(..., null)` 清除，使 dagre 能在新父节点下
放置它。

当释放点没有合法目标节点时（空白画布，或只与自身 / 当前父节点相交），系统 SHALL NOT
改变父子关系，而是通过 `mindmapStore.setNodePositions` 把 `MindMapNode.position` 固定为
释放坐标，并记入撤销历史。固定坐标 SHALL NOT 修改 `editedByUser`（布局不是内容）。
拖拽到空白画布 SHALL NOT 再隐式把节点提升为根节点。

拖拽的是分支时，系统 SHALL 让子树跟随：以拖拽起点与释放点的位移量为准，在同一 store
写入中固定该节点及其所有已渲染的子孙节点（`collectSubtreeIds()`），使子树保持原有相对
形状；折叠（未渲染）的子孙节点无实时坐标，SHALL 跳过，展开后由 dagre 放置。

将节点提升为根节点 SHALL 通过右键菜单「提升为根节点」完成：该入口仅当节点存在父节点
（`hasParent`）时显示（`data-testid="mindmap-context-promote-to-root"`），执行时 SHALL
调用 `reparentNode(mindmapId, nodeId, '')` 并清除该节点的固定坐标。

#### Scenario: Reparent node to another parent
- **WHEN** 用户将节点 A 拖拽到另一合法节点 B 上释放
- **THEN** 节点 A 及其子节点从原父节点移除，追加为节点 B 的子节点，dagre 重新布局
- **AND** 节点 A 上残留的固定坐标被清除，A 由布局放置到新父节点之下

#### Scenario: Prevent self-drop
- **WHEN** 用户拖拽节点 A 到自身
- **THEN** `pickReparentTarget()` 跳过该候选，父节点与坐标均保持不变

#### Scenario: Prevent circular reparent
- **WHEN** 用户拖拽节点 A 放置到其任意子孙节点上
- **THEN** `isDescendantOf()` 检测返回 true，该候选被跳过，操作取消

#### Scenario: Reparent persists
- **WHEN** 用户拖拽完成节点重新父子化
- **THEN** 变更通过 Zustand persist 持久化到 IndexedDB，刷新后保持

#### Scenario: Drag a branch moves its subtree
- **WHEN** 用户拖拽一个带子节点的分支到空白画布释放
- **THEN** 该节点与其已渲染的子孙节点按相同位移量一起固定，子树相对形状不变
- **AND** 该分支内未渲染（折叠）的子孙节点不写入坐标

#### Scenario: Drop on empty canvas pins the node
- **WHEN** 用户将节点 A 拖拽到空白画布释放
- **THEN** 节点 A 的父子关系不变，`MindMapNode.position` 记录释放坐标，且该操作可撤销
- **AND** 节点 A 不再被隐式提升为根节点

#### Scenario: Drop back onto the current parent pins the node
- **WHEN** 用户将节点 A 拖拽回其当前父节点 B 上释放
- **THEN** 不触发 reparent（`pickReparentTarget()` 跳过当前父节点）
- **AND** 节点 A 按释放坐标固定

#### Scenario: Invalid drop targets are skipped in favour of a valid one
- **WHEN** 拖拽释放时同时与自身、当前父节点和另一合法节点相交
- **THEN** `pickReparentTarget()` 跳过前两者，对第一个合法节点执行重新父子化

#### Scenario: Promote a node to root from the context menu
- **WHEN** 用户对存在父节点的节点打开右键菜单并点击「提升为根节点」
- **THEN** 该节点从父节点移除成为根节点，且其固定坐标被清除
- **AND** 没有父节点的节点不显示该入口

