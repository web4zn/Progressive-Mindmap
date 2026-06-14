## ADDED Requirements

### Requirement: Drill-down node focus
用户 SHALL 能够通过右键菜单「下钻到此」将一个非叶子节点设为临时根节点。下钻后，画布仅渲染该节点及其子树，dagre 以该节点为 root 重新布局。下钻状态为组件内部 UI 状态，不持久化。

#### Scenario: Drill into a node with children
- **GIVEN** 当前脑图包含 3 层节点结构
- **WHEN** 用户右键第 2 层的某个节点（该节点有子节点），点击「下钻到此」
- **THEN** 画布仅渲染该节点及其子树，dagre 将该节点定位在画布最左侧（作为新根），子树在其右侧展开

#### Scenario: Drill into a collapsed node
- **GIVEN** 某个非叶子节点处于折叠状态（`collapsedIds` 包含该节点 ID）
- **WHEN** 用户右键该节点并点击「下钻到此」
- **THEN** 该节点的直接子节点在下钻视图中可见（自动展开），但 store 中的 `collapsedIds` 不变

#### Scenario: Exit drill and restore collapse state
- **GIVEN** 用户在下钻视图内，之前进入时自动展开了被折叠的子节点
- **WHEN** 用户点击面包屑「🏠 全部」退出下钻
- **THEN** 该节点的折叠状态恢复为进入下钻前的状态

#### Scenario: Leaf node has no drill-down option
- **GIVEN** 当前节点没有子节点（`children.length === 0`）
- **WHEN** 用户右键该节点
- **THEN** 菜单中不显示「下钻到此」选项

#### Scenario: Refresh clears drill-down
- **GIVEN** 用户处于下钻状态（`drillNodeId` 不为 null）
- **WHEN** 用户刷新页面
- **THEN** 画布恢复展示完整树（下钻状态不持久化）

### Requirement: Drill-down breadcrumb navigation
下钻模式下，画布顶部 SHALL 显示面包屑导航条，展示从实际根到当前聚焦节点的完整路径。用户 SHALL 能通过点击面包屑中的任意祖先层级跳转到对应层级的聚焦视图，或点击「🏠 全部」退出下钻。

#### Scenario: Breadcrumb shows full ancestor path
- **GIVEN** 用户对根节点下的第 3 层节点执行下钻（路径：根 → A → B → C）
- **WHEN** 画布渲染下钻视图
- **THEN** 面包屑显示 `🏠 全部 → A → B → C`，当前节点 C 高亮但不可点击

#### Scenario: Click breadcrumb ancestor to re-drill
- **GIVEN** 面包屑显示 `🏠 全部 → A → B → C`，当前聚焦 C
- **WHEN** 用户点击「A」
- **THEN** `drillNodeId` 更新为 A 的节点 ID，画布切换以 A 为临时根的视图，面包屑更新为 `🏠 全部 → A`

#### Scenario: Click 🏠 to exit drill
- **GIVEN** 面包屑显示 `🏠 全部 → X → Y`
- **WHEN** 用户点击「🏠 全部」
- **THEN** `drillNodeId` 设为 null，画布恢复完整树，面包屑消失

#### Scenario: Breadcrumb hidden when not drilling
- **GIVEN** `drillNodeId` 为 null
- **THEN** `DrillBreadcrumb` 组件不渲染任何内容（返回 null）

### Requirement: Drill-down restricts search scope
下钻模式下，搜索功能 SHALL 仅匹配当前子树内的节点。搜索匹配使用已有的 `matchNodes()` 函数，但传入下钻后的 `effectiveTree` 而非完整树。

#### Scenario: Search only matches subtree nodes in drill mode
- **GIVEN** 用户下钻到节点 B，子树为 `B → C, D`，完整树还包含兄弟节点 `X → Y`
- **WHEN** 用户搜索「Y」
- **THEN** 搜索无匹配（Y 不在下钻子树内，因此不在搜索范围内）

#### Scenario: Search restores full scope on exit
- **GIVEN** 用户在下钻视图中搜索得到 1 个匹配
- **WHEN** 用户退出下钻
- **THEN** 搜索范围恢复为完整树，可能显示更多匹配项

### Requirement: Drill-down restricts outline scope
下钻模式下，大纲面板（`MindMapOutline`）SHALL 仅展示当前子树的节点。大纲以 `drillNodeId` 节点为 root 开始树遍历。

#### Scenario: Outline shows only subtree in drill mode
- **GIVEN** 用户下钻到节点 A，A 有子节点 `B, C`，C 有子节点 `D`
- **WHEN** 用户打开大纲面板
- **THEN** 大纲从 A 开始展示，列出 `A → B, C → D`，不包含完整树的其他分支

#### Scenario: Outline restores full tree on exit
- **GIVEN** 大纲在下钻模式下仅展示 5 个节点
- **WHEN** 用户退出下钻
- **THEN** 大纲恢复展示完整树的所有节点
