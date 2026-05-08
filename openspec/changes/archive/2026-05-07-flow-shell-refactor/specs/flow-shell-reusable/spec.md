## ADDED Requirements

### Requirement: FlowShell component
系统 SHALL 提供 `FlowShell` 组件，封装 React Flow (@xyflow/react) 画布，内置 Background(dots)、Controls(interactive)、MiniMap。FlowShell SHALL 不依赖项目业务类型或 store，通过 props 接受所有数据。FlowShell SHALL 支持 `layout` 属性切换 dagre 布局方向（LR/TB）。

#### Scenario: FlowShell renders with nodes
- **WHEN** 传入 `nodes` 和 `edges` 数组
- **THEN** 画布渲染 Background/Controls/MiniMap，节点按 dagre 布局排列

#### Scenario: FlowShell supports dark/light theme
- **WHEN** `theme="dark"` 传入
- **THEN** 画布使用暗色背景，节点卡片半透明毛玻璃效果

#### Scenario: FlowShell includes Controls
- **WHEN** 渲染 FlowShell
- **THEN** Controls 面板显示并可用，默认 `showInteractive: true`

### Requirement: FlowNode component
系统 SHALL 提供 `FlowNode` 组件，渲染 Rich variant 节点卡片。卡片 SHALL 包含：label（粗标题）、summary（灰色副文本）、Markdown 正文（content 存在时，react-markdown 渲染）、折叠按钮（圆形 +/-）、编辑标记（Pencil 图标，editedByUser 时显示）。卡片 SHALL 有左侧层级渐变色条（L0 最深 → L4 最淡）。

#### Scenario: FlowNode with deep hierarchy
- **WHEN** 节点 depth=3，pattern="auto"
- **THEN** 左侧色条颜色为层级渐变蓝（L3 淡蓝），折叠按钮可见

#### Scenario: FlowNode with markdown content
- **WHEN** 节点 `contentType="markdown"` 且 `content` 非空
- **THEN** 卡片底部渲染 react-markdown 正文，带滚动

### Requirement: FlowEdge component
系统 SHALL 提供 `FlowEdge` 组件，使用 smoothstep 贝塞尔曲线。边线 SHALL 支持可选渐变色（从父节点色渐变到子节点色）。

### Requirement: Zero business dependency
FlowShell / FlowNode / FlowEdge SHALL NOT 导入以下模块：`mindmapStore`、`conversationStore`、`providerStore`、`chatStore`、`@/types/mindmap`。所有数据 SHALL 通过 props 传入。

### Requirement: CSS variable theme system
FlowShell SHALL 通过自有 CSS 变量定义主题色，不依赖项目 Tailwind 主题。变量 SHALL 包括：`--flow-bg`、`--flow-card-bg`、`--flow-text`、`--flow-accent`、`--flow-border`。支持 `data-theme="dark"` / `data-theme="light"` 切换。
