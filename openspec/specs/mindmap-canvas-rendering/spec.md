## Purpose

Defines how the mindmap canvas renders the MindMapNode tree with React Flow and dagre (left-to-right) layout, including custom node and edge types, responsive sizing, and empty/loading/error states, so users can explore any graph.

## Requirements

### Requirement: React Flow rendering
系统 SHALL 使用 React Flow（@xyflow/react）渲染 MindMapNode 树结构。渲染通过 dagre 布局引擎计算节点坐标（rankdir: LR，左→右层级布局），自定义节点/边组件实现脑图样式。画布 SHALL 支持鼠标拖拽平移（pan）和滚轮缩放（zoom），缩放范围 0.1x - 2x。

MindMapNode 到 React Flow 数据格式的转换 SHALL 通过 `treeToFlow()` 完成：嵌套树 → 扁平 `nodes[] + edges[]` → dagre 布局 → 坐标。

#### Scenario: Render tree with connectors
- **WHEN** 图谱包含根节点和 3 个子节点
- **THEN** 画布上显示 4 个节点，根节点与子节点通过 smoothstep 贝塞尔边连接

#### Scenario: Pan and zoom
- **WHEN** 用户在画布空白区域拖拽或使用滚轮
- **THEN** 脑图平移或缩放

#### Scenario: Multi-level tree
- **WHEN** 图谱包含 5 层节点结构
- **THEN** 所有节点和边正确渲染，dagre 自动计算层级位置

### Requirement: nodeTypes and edgeTypes
系统 SHALL 注册自定义节点类型 `'mindmap'` 和自定义边类型 `'mindmap'`。节点 SHALL 显示 label 文本、summary 副文本、✎ 编辑标记。边 SHALL 使用 smoothstep 贝塞尔曲线。

#### Scenario: Render custom node and edge types
- **WHEN** 画布渲染节点的 label、summary 与 ✎ 编辑标记及节点间连线
- **THEN** 节点使用注册的 `'mindmap'` 节点类型，边使用 `'mindmap'` 类型并渲染为 smoothstep 贝塞尔曲线

### Requirement: Responsive sizing
系统 SHALL 在容器尺寸变化时自动调整画布。面板通过 flex 布局填充可用空间。

#### Scenario: Resize the canvas container
- **WHEN** 面板容器尺寸发生变化
- **THEN** 画布自动调整尺寸并通过 flex 布局填充可用空间

### Requirement: Empty and loading states
系统 SHALL 在 tree 为空时显示 DOM 空状态提示，在 isGenerating 为 true 时显示 DOM 加载骨架屏，在 error 存在时显示错误消息和重试按钮。

#### Scenario: Empty tree
- **WHEN** tree 为空
- **THEN** 显示 DOM 空状态提示

#### Scenario: Generating and error states
- **WHEN** isGenerating 为 true 或 error 存在
- **THEN** 分别显示 DOM 加载骨架屏，或显示错误消息与重试按钮
