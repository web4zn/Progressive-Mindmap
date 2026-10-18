## ADDED Requirements

### Requirement: Pinned node positions
系统 SHALL 把 `MindMapNode.position` 视为固定的画布坐标（pinned layout position）。
`treeToFlowShell()` SHALL 将该坐标写入 React Flow 节点的 `position`（未设置时为
`{ x: 0, y: 0 }`），并在 `FlowNodeData.pinned` 标记该节点已固定。`applyDagreLayout`
SHALL 保留已固定节点的既有坐标，而不是用 dagre 的计算结果覆盖它；未固定节点 SHALL 仍由
dagre 布局，因此整张图的边与兄弟节点保持连贯。已固定节点 SHALL 在页面刷新与树结构变化后
仍停留在该坐标。清除固定坐标（`mindmapStore.setNodePosition(..., null)`、右键菜单
「重置位置」或 `resetNodePosition`）SHALL 让该节点重新由 dagre 放置。

#### Scenario: Pinned node keeps its dropped position
- **WHEN** 用户把节点拖拽到空白画布释放，释放坐标被持久化为 `MindMapNode.position`
- **THEN** 布局重算时该节点保持释放坐标，不被 dagre 覆盖
- **AND** 其余未固定节点仍由 dagre 计算坐标

#### Scenario: Pin survives reload and structural changes
- **WHEN** 图谱包含已固定坐标的节点，页面刷新或树发生结构变化（新增、删除或重新父子化其他节点）后重新渲染
- **THEN** 该节点仍在其固定坐标处渲染
- **AND** 未固定的节点按 dagre 重新布局

#### Scenario: Clearing the pin returns the node to dagre
- **WHEN** 用户对已固定节点选择「重置位置」（或调用 `setNodePosition(..., null)`）
- **THEN** `MindMapNode.position` 被移除，`FlowNodeData.pinned` 变为 `false`
- **AND** 下一次布局由 dagre 决定该节点坐标
