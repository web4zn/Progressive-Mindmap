## ADDED Requirements

### Requirement: Tree rendering
系统 SHALL 使用递归 React 组件渲染 MindMapNode 树结构。树 SHALL 以缩进列表形式展示，节点层级通过左侧缩进量和连接线视觉区分。每个节点 SHALL 显示 label 文本。当节点有 summary 时，SHALL 在 label 下方以更小字号和低对比度颜色显示 summary。

#### Scenario: Render multi-level tree
- **WHEN** 图谱包含 3 层节点结构
- **THEN** 系统渲染缩进列表，根节点无缩进，一级子节点缩进 1 级，二级子节点缩进 2 级

#### Scenario: Render node with summary
- **WHEN** 图谱节点包含 summary 文本
- **THEN** label 以正常字号显示，summary 在 label 下方以更小字号、低对比度颜色显示

#### Scenario: Render node without summary
- **WHEN** 图谱节点不包含 summary 或 summary 为空
- **THEN** 仅显示 label，不显示空白行

### Requirement: Node expand and collapse
系统 SHALL 允许用户通过点击展开/折叠箭头切换子节点的显示状态。有子节点的节点 SHALL 默认展开。折叠后，该节点的所有子孙节点 SHALL 隐藏。

#### Scenario: Expand collapsed node
- **WHEN** 用户点击已折叠节点的展开箭头
- **THEN** 箭头旋转为向下，该节点的直接子节点显示出来

#### Scenario: Collapse expanded node
- **WHEN** 用户点击已展开节点的折叠箭头
- **THEN** 箭头旋转为向右，该节点的所有子孙节点隐藏

#### Scenario: Collapse parent hides all descendants
- **WHEN** 用户折叠一个包含多层嵌套子节点的节点
- **THEN** 该节点的所有直接和间接子节点均不可见

### Requirement: Node visual states
系统 SHALL 为节点定义以下视觉状态：
- **默认状态**: 正常文本颜色和背景
- **Hover 状态**: 鼠标悬停时节点背景色变化为半透明高亮
- **有子节点**: 显示展开/折叠箭头图标
- **叶子节点**: 不显示展开/折叠箭头，可使用不同图标区分

#### Scenario: Hover highlights node
- **WHEN** 用户鼠标悬停在某个节点上
- **THEN** 该节点背景变为半透明高亮色，过渡动画 150ms

#### Scenario: Leaf node has no toggle
- **WHEN** 某节点 children 为空数组
- **THEN** 该节点不显示展开/折叠箭头，显示叶子节点图标

### Requirement: Empty state
系统 SHALL 在思维导图为空时显示空状态提示。提示 SHALL 包含说明文字和引导操作按钮。

#### Scenario: Empty mindmap
- **WHEN** 当前图谱的 tree 数组为空
- **THEN** 面板显示"此图谱暂无内容"提示文字和"关联对话并生成"操作建议

#### Scenario: Mindmap selected but no conversations linked
- **WHEN** 当前图谱有关联的 Conversation 但尚未触发过生成
- **THEN** 面板显示空状态并提示"点击'更新图谱'从对话中生成内容"

### Requirement: Loading and error states
系统 SHALL 在面板中显示生成过程中的加载状态和错误状态。

#### Scenario: Generating state
- **WHEN** 图谱正在生成中
- **THEN** 树视图区显示加载动画（如脉冲骨架屏），禁用交互，工具栏显示"生成中..."

#### Scenario: Error state
- **WHEN** 图谱生成失败
- **THEN** 面板显示错误消息、错误描述文字和"重试"按钮

### Requirement: Tree scroll behavior
系统 SHALL 在树内容超出面板高度时提供垂直滚动。滚动区域 SHALL 占满工具栏下方剩余空间。

#### Scenario: Tree overflows panel height
- **WHEN** 树结构的渲染高度超过面板可视区域
- **THEN** 面板显示垂直滚动条，工具栏固定在顶部不随滚动移动
