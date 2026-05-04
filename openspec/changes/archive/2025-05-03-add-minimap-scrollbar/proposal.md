## Why

当前思维导图树视图和聊天消息列表使用原生浏览器滚动条（4px 细线样式），用户在浏览长内容时缺乏全局视野——无法一眼看出当前所处位置、内容总长度、以及内容的结构轮廓。类似 VS Code 的 minimap 滚动条（在滚动条位置显示整个内容的缩略图）能提供「鸟瞰视图」，让用户快速定位和导航。

## What Changes

- 新增可复用的 `Minimap` 组件，通过 CSS transform 克隆滚动容器内容并缩小渲染
- 在 `MindMapTree`（导图树视图）右侧集成 minimap，显示树的层级结构缩略图
- 在 `MessageList`（聊天消息列表）右侧集成 minimap，显示对话的密度轮廓
- minimap 上显示当前可见区域的高亮覆盖层，实时同步滚动位置
- minimap 支持点击和拖拽导航，反向控制滚动容器
- 窗口/内容大小变化时自动重新计算 minimap 缩放比例

## Capabilities

### New Capabilities

- `minimap-scrollbar`: 通用的 minimap 滚动条组件，接收滚动容器 DOM ref，自动克隆内容、缩放渲染、同步滚动位置，支持点击/拖拽导航。同时为 `MessageList` 和 `MindMapTree` 提供集成。

### Modified Capabilities

<!-- 无现有 requirement 被修改。本变更为纯增量功能，不影响现有行为。 -->

## Impact

- 新增文件: `src/components/Minimap.tsx`（约 120 行）
- 修改文件: `src/features/mindmap/MindMapTree.tsx`（约 10 行改动，加 ref + flex 布局）
- 修改文件: `src/features/chat/MessageList.tsx`（约 20 行改动，布局从 absolute 改为 flex + 嵌入 Minimap）
- 不动文件: `ChatPage.tsx`、`MindMapPanel.tsx`、store、types 均不受影响
- 零外部依赖，纯 DOM API + CSS transform + React hooks
