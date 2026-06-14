# Mindmap Drill-Down — 脑图下钻

> 右键节点将其变为临时根节点，画布只展示其子树，配合面包屑导航逐层返回。

## Why

当前脑图已经具备 collapse/expand 折叠能力，但缺少「聚焦某个节点并以其为中心审视子树」的交互模式。用户在处理大型脑图时，经常需要：

- 深入某个分支，将其当作独立的子脑图来审视
- 排除其他分支的视觉干扰
- 清楚地知道自己「在哪一层」，并能随时回到任意祖先层级

现有的 collapse 只在原地隐藏子节点，`focusNode` 只移动相机但不改变渲染内容——都没有提供真正「以节点为根重新审视子树」的体验。

## What Changes

### 1. 下钻状态（drillNodeId）

`MindMapTree` 内部新增 `drillNodeId: string | null` 状态。当设置时，`effectiveTree` 过滤逻辑将树截取为仅包含该节点及其子树的视图：

```
完整 tree                              drillNodeId = "B"

  A (root)                              B (temp root)
  ├── B  ← 右键"下钻到此"                ├── C
  │   ├── C                            │   ├── E
  │   │   ├── E                        │   └── F
  │   │   └── F                        └── D
  │   └── D                                └── G
  └── X (隐藏)
      └── Y (隐藏)
```

- `drillNodeId` 为 `null` 时，`effectiveTree` 行为不变（保持现有过滤逻辑）
- `drillNodeId` 不为 `null` 时，`effectiveTree` 从 `MindMap.tree` 中查找目标节点，返回 `[targetNode]` 作为单根树
- dagre 以该节点为 root 重新布局（无需改动 dagre 逻辑）

### 2. 面包屑导航（DrillBreadcrumb）

新增 `DrillBreadcrumb` 组件，渲染在画布顶部（`MindMapTree` 的 `position: relative` 容器内，位于 FlowShell 上方），显示从实际根到当前聚焦节点的路径：

```
[🏠 全部]  →  [需求分析]  →  [用户故事]
```

- 点击 `🏠 全部` → `drillNodeId` 设为 `null`，退出下钻
- 点击中间层级（如 `需求分析`）→ `drillNodeId` 设为对应节点 ID，钻回到该层
- 当前所在节点高亮但不可点击
- 使用 `findAncestorChain()` 获取路径（已有纯函数，`src/lib/mindmap-path.ts`）

### 3. 右键菜单集成

在现有 `MindMapContextMenu` 中添加「下钻到此」菜单项：

- 菜单项位置：在「在画布居中」与「复制节点」之间（即结构导航相关操作区域）
- 图标：`ZoomIn`（lucide-react）
- 快捷键：无（通过菜单触发）
- **仅在节点有子节点时显示**（叶子节点不显示，`hasChildren === true` 为前置条件）
- 触发后：`drillNodeId = nodeId`，菜单关闭，画布重绘

### 4. 下钻时自动展开

进入下钻视图时，自动展开 `drillNodeId` 的直接子节点：

- 不影响 `mindmapStore` 中的 `collapsedNodeIds`（foldedIds 不写入 IndexedDB）
- 在 `effectiveTree` 过滤期间，下钻节点的子节点即使被折叠也强制展示
- 用户退出下钻后，折叠状态恢复（从 store 读取）

### 5. 搜索范围限定

下钻模式下，搜索 `matchNodes()` 限当前子树：

- 传入 `effectiveTree` 而不是完整 `tree`
- 匹配项仅为可见子树内的节点

### 6. 大纲面板（MindMapOutline）限定

下钻模式下，`MindMapOutline` 仅展示当前子树：

- 传入 `effectiveTree` 而不是 `activeMindmap?.tree`
- 大纲深度为 0 代表以 `drillNodeId` 节点为根

## Non-goals

- **不改变** mindmap 数据模型（`MindMap.tree` / `MindMapNode` 字段不变）
- **不持久化**下钻状态——刷新页面后恢复完整树视图（不需要给 `MindMap` 新增 `drillNodeId` 字段）
- **不改变** collapse/expand 的存储逻辑（`collapsedNodeIds` 仍持久化在 `MindMap` 对象中）
- **不改变** React Flow / dagre 的核心布局逻辑
- **不影响** undo/redo 行为
- **不改变** Electron 相关代码
- **不新增**键盘快捷键（首发仅右键菜单触发）

## Capabilities

### New Capabilities
- `mindmap-drill-down` — 节点下钻聚焦模式，支持右键触发、面包屑导航、子树隔离

### Modified Capabilities
- `mindmap-canvas-rendering` — `effectiveTree` 过滤逻辑扩展支持 `drillNodeId` 子树截取
- `mindmap-tree-view` — `MindMapOutline` 下钻模式下仅展示当前子树

## Impact

- **新增文件**：
  - `src/components/flow-shell/DrillBreadcrumb.tsx` — 面包屑组件（~80 行）
  - `src/components/flow-shell/__tests__/DrillBreadcrumb.test.tsx` — 面包屑测试
  - `src/lib/__tests__/mindmap-drill.test.ts` — 下钻树过滤单元测试

- **修改文件**：
  - `src/features/mindmap/MindMapTree.tsx` — 新增 `drillNodeId` state，扩展 `effectiveTree` 过滤逻辑，传递 `focusedTree` 给 Outline
  - `src/features/mindmap/MindMapContextMenu.tsx` — 新增「下钻到此」菜单项（含 props、MENU_ORDER、trigger、render）

- **不修改的文件**：
  - `src/stores/mindmapStore.ts` — 无 store 变更
  - `src/types/mindmap.ts` — 无类型变更
  - `src/lib/mindmap-flow.ts` / `mindmap-layout.ts` — 无变更（下钻仅改变输入树，dagre 自动以新根布局）
  - `src/lib/mindmap-path.ts` — `findAncestorChain()` 已存在，直接复用

- **测试**：新增 ~8 个测试覆盖下钻树过滤、面包屑渲染、叶子节点菜单隐藏、自动展开行为

- **UI 状态**：`MindMapTree` 内部状态（`useState`），不影响组件接口和 Store 形状

## Assumptions Confirmed

| # | 问题 | 决策 |
|---|------|------|
| 1 | 下钻模式 | A - 节点聚焦，右键触发 |
| 2 | 面包屑行为 | 显示 `🏠 全部 → ... → 当前节点`，可点击跳转任意层级 |
| 3 | 叶子节点 | 不显示「下钻到此」选项 |
| 4 | 折叠状态 | 下钻时自动展开直接子节点，退出后恢复 |
| 5 | 搜索范围 | 下钻模式下搜索限定当前子树 |
| 6 | 大纲视图 | 下钻模式下只展示当前子树 |
| 7 | 持久化 | 不需要，刷新后回到根视图 |
