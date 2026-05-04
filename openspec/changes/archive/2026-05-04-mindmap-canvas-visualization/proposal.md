## Why

当前 DOM 缩进树无法提供真正的脑图体验。mind-elixir 功能丰富但遇到画布交互问题，且 API 为命令式非 React 原生。React Flow（@xyflow/react）是行业标准的 React 节点图框架——Zermind、Stripe、n8n 均在使用——提供 React 原生组件体系、自定义节点/边、完整布局集成。切换后数据模型从嵌套树变为扁平 nodes/edges，需要全新设计但换来的控制力无可比拟。

## What Changes

### 数据层（全新设计）
- **新增扁平化适配器**：`MindMapNode[]` 嵌套树 ↔ `{ nodes: Node[], edges: Edge[] }` 双向转换
- **新增 dagre 布局引擎**：自动计算层级脑图的节点坐标（rankdir: LR，左→右布局）
- **新增 expand/collapse**：通过 `useMindmapLayout` hook 管理可见性过滤

### UI 层（全新组件）
- **重写 MindMapTree.tsx**：React Flow `<ReactFlow>` 声明式组件
- **新增 MindMapNodeComponent**：自定义节点（label + summary + ✎/💬N tags + 编辑态）
- **新增 MindMapEdgeComponent**：自定义贝塞尔边（smoothstep 风格）
- **新增 MindMapContextMenu**：React Portal 右键菜单
- **新增 MindMapEditModal**：双击节点 → 居中 Modal 编辑

### 交互层
- 内联编辑：双击 → Modal（label + summary 输入框）
- 拖拽重新父子化：`onNodeDragStop` → 检测新父节点 → store 更新 + 重新布局
- 展开折叠：点击展开按钮 → 过滤可见节点/边 + 重新布局
- 画布操作：React Flow 内置平移/缩放/适配视图
- 右键菜单：节点 → 添加子节点/上移/下移/删除

### 布局变更（ChatPage）
- 脑图面板从可选切换改为**默认显示**：聊天区 `max-w-lg` 左靠，脑图 `flex-1` 填充右侧
- **新增全屏模式**：MindMapPanel 工具栏 ⛶ 按钮，`fixed inset-0 z-50` 覆盖全视口
- **移除**：panelVisible toggle 按钮、panelWidth 状态、ResizableSeparator（改为简单分隔线）
- ResizableSeparator maxWidth 600→800（保留为备用）

### 移除
- **BREAKING**：移除 mind-elixir、simple-mind-map 及所有命令式 API 调用
- 移除 `mindmap-tree-adapter.ts`（旧适配器）

## Capabilities

### New Capabilities
- `mindmap-react-flow-rendering`: React Flow 渲染引擎，自定义节点/边，dagre 层级布局，画布交互
- `mindmap-expand-collapse`: 节点展开折叠状态管理与可见性过滤 + 动态重新布局
- `mindmap-tree-to-flat`: 嵌套树 ↔ 扁平 nodes/edges 双向数据转换

### Modified Capabilities
- `mindmap-tree-view`: 渲染改为 React Flow，保留空/加载/错误/流式状态
- `mindmap-node-editing`: 编辑触发改为 Modal 弹窗
- `mindmap-drag-reparent`: 拖拽改为 React Flow `onNodeDragStop`

## Impact

- **新增文件**：`MindMapNodeComponent.tsx`, `MindMapEdgeComponent.tsx`, `MindMapContextMenu.tsx`, `MindMapEditModal.tsx`, `useMindmapLayout.ts`, `src/lib/mindmap-layout.ts`
- **重写文件**：`MindMapTree.tsx`, `mindmap-tree-adapter.ts`
- **依赖变更**：`mind-elixir` → `@xyflow/react` + `@dagrejs/dagre`
- **数据模型**：MindMapNode 不变，内部增加扁平化转换层
- **MindMapTree props**：接口不变
