## MODIFIED Requirements

### Requirement: Tree rendering
系统 SHALL 使用 React Flow（@xyflow/react）+ dagre 布局渲染 MindMapNode 树结构，替代原有 DOM 缩进列表方式。渲染内容 SHALL 包括：自定义节点（label + summary + ✎ 编辑标记）、节点间 smoothstep 贝塞尔连接线、Background 网格、Controls 缩放控件、MiniMap 导航。树 SHALL 使用层级布局（dagre rankdir: LR，左→右）。

#### Scenario: Render multi-level tree
- **WHEN** 图谱包含 4 层节点结构
- **THEN** 画布上渲染 4 层节点及 smoothstep 连接线，dagre 自动排列位置

#### Scenario: Render node with summary
- **WHEN** 图谱节点包含 summary
- **THEN** 节点在 label 下方以更小字号和低对比度颜色显示 summary

### Requirement: Node expand and collapse
系统 SHALL 通过 `useMindmapLayout` hook 管理展开折叠状态。有子节点的节点 SHALL 显示展开/折叠按钮并默认展开。折叠时子节点和连接线在 dagre 重新布局时过滤。展开/折叠仅取决于节点是否有 children。

#### Scenario: Expand collapsed node
- **WHEN** 用户点击已折叠节点的展开按钮
- **THEN** 子节点及连接线显示，dagre 重新布局

#### Scenario: Collapse expanded node
- **WHEN** 用户点击已展开节点的折叠按钮
- **THEN** 子孙节点及连接线隐藏，dagre 重新布局

#### Scenario: Leaf node has no toggle
- **WHEN** 节点无子节点
- **THEN** 不显示展开/折叠按钮

### Requirement: Node visual states
系统 SHALL 实现以下节点视觉状态：
- **编辑标记**: `editedByUser === true` → 显示 Pencil 图标
- **有子节点**: 显示 ChevronDown/ChevronRight 展开按钮
- **叶子节点**: 无展开按钮
- **Markdown 内容节点**: `contentType === 'markdown'` → 在节点内渲染 Markdown 正文（react-markdown + remarkGfm）

### Requirement: Empty state
tree 为空时 SHALL 显示 "此图谱暂无内容" 提示。

### Requirement: Loading state
isGenerating 为 true 时 SHALL 显示骨架屏加载动画。

### Requirement: Error state
error 存在时 SHALL 显示错误消息和 "重试" 按钮。

### Requirement: Streaming indicator
isStreaming 为 true 时 SHALL 在画布顶部显示 "生成中…" 叠加指示。

### Requirement: Layout switch via panel toggle
面板已改为**默认显示**（ChatPage 中脑图 flex-1 填充右侧空间）。用户可通过 MindMapPanel 中的 ✕ 按钮折叠脑图，或通过 ⛶ 按钮进入全屏模式（fixed inset-0 z-50）。

## REMOVED Requirements

### Requirement: Material selection indicator on messages
**Reason**: 属于 mindmap-content-selection 功能
**Migration**: 无影响
