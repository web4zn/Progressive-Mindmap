## MODIFIED Requirements

### Requirement: Tree rendering
系统 SHALL 使用 `FlowShell` 替代直接 React Flow 渲染。节点 SHALL 使用 FlowShell 内置的 Rich 卡片样式（层级渐变色条 + label + summary + content）。边 SHALL 使用 FlowShell 内置的 Smoothstep 边线。

### Requirement: Node visual states
系统 SHALL 使用 FlowShell 内建的节点视觉状态：
- **编辑标记**: `editedByUser === true` → Pencil 图标
- **层级渐变**: 色条颜色从 L0 最深到 L4 最淡
- **折叠按钮**: 圆形 +/- 按钮
- **选中态**: ring + scale-105 + glow shadow
