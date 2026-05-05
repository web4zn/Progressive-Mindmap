## Why

当前脑图仅能做 Markdown 文本导出（`exportMindmapAsMarkdown`），无法导出可视化的 PNG 或 SVG 图片。用户花了时间建知识树却带不走。每个成熟脑图工具（simple-mind-map、markmap、mind-elixir）都支持可视化导出，这是用户最基本的期望。

## What Changes

- **PNG 导出**：将 React Flow 画布截取为 PNG 图片并下载，支持自定义分辨率（1x / 2x / 3x）
- **SVG 导出**：将 React Flow 渲染结果导出为独立 SVG 文件（矢量、可缩放、可编辑）
- **导出 UI**：MindMapPanel 工具栏新增导出下拉按钮（PNG 1x / 2x / SVG），替换当前单一的 Markdown 导出按钮
- **全脑图导出**：无论是部分折叠还是全展开，导出时自动展平所有节点，导出完整脑图

## Capabilities

### New Capabilities
- `mindmap-png-export`: 将脑图画布导出为 PNG 位图，支持分辨率选择
- `mindmap-svg-export`: 将脑图画布导出为 SVG 矢量图

### Modified Capabilities
- `mindmap-panel-layout`: 工具栏新增导出下拉菜单

## Impact

- **依赖新增**：`html-to-image` 或 `dom-to-image-more`（DOM → PNG/SVG 截图）
- **新增文件**：`src/lib/export-png.ts`（PNG 导出逻辑）、`src/lib/export-svg.ts`（SVG 导出逻辑）
- **面板变更**：`src/features/mindmap/MindMapPanel.tsx` 导出按钮改为下拉菜单
- **布局**：导出前需要临时计算展平所有折叠节点的完整布局
