## Context

React Flow 的数据模型与 MindMapNode 截然不同——前者是扁平 `nodes[] + edges[]`，后者是嵌套树。核心挑战：每次树变更都需经过「树 → 扁平 → dagre 布局 → React Flow」的转换链。面板布局从可选切换改为默认显示（聊天左靠、脑图右占）。

## Goals / Non-Goals

**Goals:**
- React Flow 渲染脑图（自定义节点/边、dagre 层级布局、平移缩放、MiniMap）
- 嵌套树 → 扁平 nodes/edges 转换
- 展开折叠 + 自动重新布局
- 双击 Modal 编辑、Portal 右键菜单、拖拽重新父子化
- 空/加载/错误/流式状态、全屏模式

**Non-Goals:**
- 不实现关联线（cross-branch arrows）
- 不实现 React Flow Pro 功能

## Decisions

### D1: dagre 布局 (rankdir: LR)
`src/lib/mindmap-layout.ts` 中 `treeToFlow()` + `applyLayout()`。配置：nodesep: 30, ranksep: 80。

### D2: 展开折叠 → useMindmapLayout
`collapsedIds: Set<string>` 过滤 + 重新布局。

### D3: 自定义节点 → MindMapNodeComponent
显示 label + summary + ✎ 标记 + 💬N 徽章 + 展开按钮。React.memo。

### D4: 自定义边 → MindMapEdgeComponent
`getSmoothStepPath`, borderRadius: 8。

### D5: 编辑 → MindMapEditModal (居中 Modal)
### D6: 右键菜单 → MindMapContextMenu (Portal)
### D7: 拖拽 → onNodeDragStop + BoundingRect 检测 + reparentNode
### D8: 全屏 → isFullscreen state, fixed inset-0 z-50
### D9: 布局 → ChatPage 聊天左靠 max-w-lg，脑图 flex-1 右占
