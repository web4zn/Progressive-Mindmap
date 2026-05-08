## MODIFIED Requirements

### Requirement: React Flow rendering
系统 SHALL 使用 `FlowShell` 组件渲染 MindMapNode 树结构，替代直接使用 `@xyflow/react`。`FlowShell` SHALL 通过 `design="rich"`、`pattern`(来自 MindMap.pattern)、`theme="dark"` 配置视觉样式。dagre 布局计算 SHALL 移至 FlowShell 内部。

#### Scenario: Render tree with FlowShell
- **WHEN** 图谱包含根节点和子节点
- **THEN** FlowShell 渲染所有节点，使用 Smoothstep 边线连接，dark 主题 + 层级渐变色条

### Requirement: nodeTypes and edgeTypes
系统 SHALL 使用 FlowShell 内置的节点类型 `'flow'` 和边类型 `'flow-smoothstep'`，替代原有的 `'mindmap'` 自定义类型。节点 SHALL 显示 Rich 卡片（label + summary + content + 层级色条 + 折叠按钮 + 编辑标记）。
