## MODIFIED Requirements

### Requirement: Tree rendering
系统 SHALL 使用递归 React 组件渲染 MindMapNode 树结构。树 SHALL 以缩进列表形式展示，节点层级通过左侧缩进量视觉区分。缩进量 SHALL 随深度递减避免深层节点空间不足（公式：`min(depth * 16, 48)` px）。每个节点 SHALL 显示 label 文本。当节点有 summary 时，SHALL 在 label 下方以更小字号和低对比度颜色显示 summary。

#### Scenario: Render multi-level tree
- **WHEN** 图谱包含 4 层节点结构
- **THEN** 系统渲染缩进列表，缩进量从 0 递增但不超过 48px

#### Scenario: Render node with summary
- **WHEN** 图谱节点包含 summary 文本
- **THEN** label 以正常字号显示，summary 在 label 下方以更小字号、低对比度颜色显示

### Requirement: Node expand and collapse
系统 SHALL 允许用户通过点击展开/折叠箭头切换子节点的显示状态。有子节点（`children.length > 0`）的节点 SHALL 显示可点击箭头并默认展开。叶子节点（`children.length === 0`）SHALL 显示文件图标。展开/折叠逻辑 SHALL 仅取决于节点数据（是否有 children），不基于深度硬编码。

#### Scenario: Expand collapsed node
- **WHEN** 用户点击已折叠节点的展开箭头
- **THEN** 箭头旋转为向下，该节点的直接子节点显示出来

#### Scenario: Collapse expanded node
- **WHEN** 用户点击已展开节点的折叠箭头
- **THEN** 箭头旋转为向右，该节点的所有子孙节点隐藏

#### Scenario: Deep node with children is expandable
- **WHEN** 第 4 层节点有子节点（children.length > 0）
- **THEN** 节点显示展开/折叠箭头，用户可展开查看子节点

#### Scenario: Leaf node at any depth
- **WHEN** 任意深度的节点无子节点
- **THEN** 节点显示文件图标，不可展开

### Requirement: Node visual states
系统 SHALL 为节点定义以下视觉状态：
- **默认状态**: 正常文本颜色和背景
- **Hover 状态**: 鼠标悬停时节点背景色变化为半透明高亮
- **有子节点**: 显示展开/折叠箭头图标
- **叶子节点**: 显示文件图标
- **编辑状态**: 显示输入框，蓝色边框高亮
- **手动编辑标记**: 显示 ✎ 图标
- **来源标记**: 显示 💬 N 对话来源数量

#### Scenario: Depth 4 node visual
- **WHEN** 树包含第 4 层节点
- **THEN** 4 层节点的缩进量不超过 48px，字号与第 3 层相同或略小
