## Tasks

### 1. 添加导出依赖
- [x] 安装 `html-to-image`

### 2. 实现 PNG 导出
- [x] `src/lib/export-png.ts`：实现 `exportMindmapAsPng(pixelRatio: 1|2|3)`，使用 `html-to-image` 的 `toPng` 截取 React Flow 容器 DOM
- [x] 导出前展开所有折叠节点 → 等待布局更新 → 截图 → 恢复折叠状态
- [x] 文件命名：`{图谱标题}_{日期}.png`

### 3. 实现 SVG 导出
- [x] `src/lib/export-svg.ts`：实现 `exportMindmapAsSvg()`，使用 `html-to-image` 的 `toSvg` 导出
- [x] 文件命名：`{图谱标题}_{日期}.svg`

### 4. 导出 UI
- [x] `src/features/mindmap/MindMapPanel.tsx`：导出按钮改为带下拉菜单的 SplitButton
- [x] 下拉选项：PNG 1x / PNG 2x / PNG 3x / SVG / Markdown
- [x] 默认点击行为：PNG 2x 导出

### 5. 测试
- [ ] `export-png.test.ts`：验证 `toPng` 调用和参数正确
- [x] 手动测试：各分辨率 PNG 和 SVG 导出效果.ts`：验证 `toSvg` 调用和参数正确
- [x] `MindMapPanel.test.tsx`：导出按钮 UI 测试
- [ ] 手动测试：各分辨率 PNG 和 SVG 导出效果
