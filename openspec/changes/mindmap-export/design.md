## Decisions

### D1: 截图库选择

**选择**：使用 `html-to-image`（基于 SVG foreignObject）。

**替代方案**：
- `dom-to-image-more`：功能更多但维护频率低，包体积更大
- Canvas 手动绘制：工作量大，无法准确复刻 CSS 样式
- React Flow 内置 `getNodes()` 后自行渲染：丢失自定义节点样式

**决策依据**：`html-to-image` 轻量（~5KB gzip）、API 简洁（`toPng` / `toSvg`）、广泛使用（npm 周下载量 200 万+），足以满足 DOM → 图片的需求。

### D2: 导出范围

**选择**：导出时自动展开所有折叠节点，计算完整布局后再截图。导出完成后恢复折叠状态。

**替代方案**：
- 仅导出可见部分：用户可能需要手动展开才能导出完整脑图
- 导出 React Flow nodes/edges 数据后服务端渲染：增加后端依赖，与项目 local-first 理念矛盾

**决策依据**：用户期望导出完整脑图，自动展开是预期行为。展开→布局→截图→恢复的流程对性能影响可控（脑图规模通常在 100 节点以内）。

### D3: PNG 分辨率

**选择**：提供 1x / 2x / 3x 三档。2x 为默认。

**决策依据**：现代显示器多为 Retina，1x 导出会模糊。3x 用于打印场景。`html-to-image` 的 `pixelRatio` 参数直接支持。

### D4: SVG 导出

**选择**：使用 `html-to-image` 的 `toSvg` 方法，直接输出 SVG markup 字符串，通过 Blob 下载。

**决策依据**：SVG 是矢量格式，适合后续编辑（Figma/Illustrator）。`toSvg` 不依赖 Canvas，输出质量无损。

### D5: 导出按钮 UI

**选择**：MindMapPanel 工具栏中「导出」按钮改为带下拉菜单的 SplitButton，主按钮默认 PNG 2x 导出，下拉展开 PNG 1x / PNG 2x / PNG 3x / SVG / Markdown 选项。

**决策依据**：保留已有的 Markdown 导出，增加可视化导出。SplitButton 模式兼顾快捷操作和选项丰富性。
