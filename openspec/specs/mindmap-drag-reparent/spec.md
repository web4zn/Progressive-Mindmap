## ADDED Requirements

### Requirement: Drag node to reparent
系统 SHALL 允许用户通过拖拽将节点重新父子化。用户拖拽节点到目标节点附近区域释放时，SHALL 通过 `onNodeDragStop` 检测目标节点（BoundingRect 距离阈值 20px）。拖拽前 SHALL 验证合法性：不能放置到自身、不能放置到子孙节点（防止循环引用）。验证通过后 SHALL 调用 `mindmapStore.reparentNode` 持久化变更并触发布局重算。

#### Scenario: Reparent node to another parent
- **WHEN** 用户将节点 A 拖拽到节点 B 附近释放
- **THEN** 节点 A 及其子节点从原父节点移除，追加为节点 B 的子节点，dagre 重新布局

#### Scenario: Prevent self-drop
- **WHEN** 用户拖拽节点 A 到自身
- **THEN** reparent 检测跳过，节点保持原位

#### Scenario: Prevent circular reparent
- **WHEN** 用户拖拽父节点放置到其任意子孙节点上
- **THEN** `isDescendantOf()` 检测返回 true，操作取消

#### Scenario: Reparent persists
- **WHEN** 用户拖拽完成节点重新父子化
- **THEN** 变更通过 Zustand persist 持久化（IndexedDB/localStorage），刷新后保持
