## Decisions

### D1: 截图库选择

**选择**：使用 `html-to-image@1.11.11`（锁定版本），基于 SVG foreignObject 渲染。

**替代方案**：
- `html-to-image` 最新版：React Flow 官方文档明确指出 1.11.11 之后版本有 bug（issue #516），无法正常导出
- `dom-to-image-more`：有 SSR 兼容问题，初始化时报 `Node is not defined`
- Canvas 手动绘制：工作量大，无法准确复刻 CSS 样式

**决策依据**：`html-to-image@1.11.11` 是 React Flow 官方 Download Image 示例的推荐方案，经过验证可正确处理节点和边。

### D2: 完整脑图导出策略

**选择**：使用 React Flow 的 `getNodes()` 获取所有节点 → `getNodesBounds()` 计算边界框 → `getViewportForBounds()` 计算最优视口变换 → 将 transform 作为 `style` 参数传给 `html-to-image`，覆写克隆节点的 CSS。

**替代方案**：
- fitView → 截图 → restoreViewport：操作真实 DOM，用户可见视口跳变
- 仅导出可见部分：用户放大后只能看到局部

**决策依据**：`html-to-image` 的 `style` 参数仅作用于克隆节点，不碰真实 DOM。这是 React Flow 官方示例的做法，零副作用。

### D3: React Flow 实例访问

**选择**：MindMapTree 通过 `onInit` 回调将 `instance.getNodes` 挂载到 `window.__mindmapGetNodes`，导出函数通过 window 访问。

**替代方案**：
- 将 ReactFlowInstance 作为 ref 层层传递给 MindMapPanel：侵入性强，跨组件传递复杂
- 使用 React Flow 的 `useReactFlow` hook：只能在 ReactFlow 子组件中使用，导出逻辑在组件外

**决策依据**：MindMapTree 已在 window 上挂载 `__mindmapToggle`，沿用相同模式。符合项目现有架构。

### D4: SVG 边渲染修复

**选择**：MindMapEdgeComponent 同时使用 `className`（用于实时渲染）和 `style={{ stroke: 'rgba(148,163,184,0.3)', strokeWidth: 1.5 }}`（用于导出）。

**决策依据**：`html-to-image` 克隆 DOM 时，SVG path 元素的 CSS 类样式（Tailwind 的 `!stroke-muted-foreground/30`）在 foreignObject 中丢失。内联 style 使用具体 rgba 颜色值，克隆时正确保留。

### D5: PNG 分辨率

**选择**：提供 1x / 2x / 3x 三档。2x 为默认。

**决策依据**：现代显示器多为 Retina，1x 导出会模糊。3x 用于打印场景。`html-to-image` 的 `pixelRatio` 参数直接支持。

### D6: PNG 背景色

**选择**：从 CSS 变量 `--background` 读取实际背景色，传给 `toPng` 的 `backgroundColor` 选项。

**决策依据**：不指定 `backgroundColor` 时 `toPng` 渲染为透明/灰色，与页面背景不一致。读取 CSS 变量确保导出背景色与当前主题匹配。

### D7: SVG 导出

**选择**：使用 `html-to-image` 的 `toSvg` 方法，直接输出 SVG markup 字符串，通过 data URL 下载。

**决策依据**：SVG 是矢量格式，适合后续编辑（Figma/Illustrator）。`toSvg` 不依赖 Canvas，输出质量无损。

### D8: 导出按钮 UI

**选择**：MindMapPanel 工具栏中「导出」按钮改为带 DropdownMenu，选项为 PNG 1x / PNG 2x / PNG 3x / SVG / Markdown。

**决策依据**：保留已有的 Markdown 导出，增加可视化导出选项。
