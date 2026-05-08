## ADDED Requirements

### Requirement: Icon system consistency
全站 SHALL 使用 Lucide React 图标组件替代所有 emoji 图标。图标 SHALL 使用一致的尺寸（默认 `w-4 h-4`，小号 `w-3 h-3`）。不允许混用 emoji 和 SVG 图标。

#### Scenario: All icons use Lucide
- **WHEN** 用户浏览应用的所有界面元素
- **THEN** 任何功能图标均使用 Lucide 组件渲染，无 emoji 图标残留

#### Scenario: Icon sizing consistency
- **WHEN** 在不同 UI 上下文中渲染图标
- **THEN** 图标尺寸遵循 `w-4 h-4`（按钮/操作）或 `w-3 h-3`（inline/装饰）两级规范

### Requirement: Color system
应用 SHALL 定义清晰的色彩层级。侧边栏 SHALL 使用主题自适应背景（`bg-sidebar`），内容区 SHALL 保持干净背景。强调色 SHALL 用于关键操作（发送、激活态）。

#### Scenario: Sidebar theme adaptive
- **WHEN** 系统为浅色主题
- **THEN** 侧边栏使用浅色背景，与内容区通过分隔线区分

#### Scenario: Sidebar theme adaptive (dark mode)
- **WHEN** 系统为深色主题
- **THEN** 侧边栏使用深色背景

### Requirement: Typography hierarchy
消息内容 SHALL 使用 14px（sm）字号，标题使用 16px（base）及以上。行高 SHALL 为 1.6 以优化长文本可读性。代码块 SHALL 使用等宽字体。

#### Scenario: Message typography
- **WHEN** 显示聊天消息
- **THEN** 消息正文使用 14px 字号、1.6 行高、正常字重

### Requirement: Animation system
应用 SHALL 在以下场景使用微动画：消息出现时从下方滑入并淡入、侧边栏悬停时背景色过渡、按钮点击反馈、流式输出指示器脉冲。所有动画 SHALL 持续 200-300ms。用户若设置了 `prefers-reduced-motion`，SHALL 禁用所有动画。

#### Scenario: Message appear animation
- **WHEN** 新消息添加到对话中
- **THEN** 消息元素从下方 8px 滑入并淡入，动画持续 200ms

#### Scenario: Reduced motion respected
- **WHEN** 用户系统启用了减少动效设置
- **THEN** 所有动画被禁用，元素直接显示

### Requirement: Spacing system
消息之间的间距 SHALL 为 16px（上下），消息内部内容与气泡边缘 SHALL 保持 12-16px padding。内容区两侧 SHALL 保留 16-24px padding。

#### Scenario: Message spacing
- **WHEN** 多条消息连续显示
- **THEN** 相邻消息之间有 16px 垂直间距，消息气泡内部有 12-16px padding
