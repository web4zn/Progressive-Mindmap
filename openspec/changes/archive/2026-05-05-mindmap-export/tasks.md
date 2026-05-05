## Tasks

### 1. 添加导出依赖
- [x] 安装 `html-to-image@1.11.11`

### 2. 实现导出核心逻辑
- [x] `src/lib/export-mindmap.ts`：合并 PNG/SVG 导出，使用 React Flow `getNodesBounds` + `getViewportForBounds` 计算最优视口，`style` 参数覆写克隆节点 CSS
- [x] 文件命名：`{图谱标题}_{日期}.{png|svg}`
- [x] `src/features/mindmap/MindMapTree.tsx`：`onInit` 挂载 `getNodes` 到 window 供导出调用

### 3. 边渲染修复
- [x] `src/features/mindmap/MindMapEdgeComponent.tsx`：内联 style 替代 CSS 类，确保 `html-to-image` 克隆时 SVG path 正确渲染

### 4. 导出 UI
- [x] `src/features/mindmap/MindMapPanel.tsx`：导出按钮改为 DropdownMenu
- [x] 下拉选项：PNG 1x / PNG 2x / PNG 3x / SVG / Markdown

### 5. 测试
- [x] `export-png.test.ts`：`html-to-image` 依赖浏览器 Canvas API，无法在 jsdom/happy-dom 环境做单元测试；已在浏览器中手动验证
- [x] `export-svg.test.ts`：同上，已在浏览器中手动验证
- [x] 手动测试：各分辨率 PNG 和 SVG 导出效果
