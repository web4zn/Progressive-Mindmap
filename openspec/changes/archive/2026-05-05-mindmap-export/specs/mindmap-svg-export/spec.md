## Purpose

脑图可视化 SVG 矢量导出能力，保留完整样式可编辑。

## ADDED Requirements

### Requirement: Export mindmap as SVG
系统 SHALL 支持将当前脑图画布导出为 SVG 矢量图文件。导出 SHALL 通过 React Flow 计算完整脑图的最优视口变换，覆写到克隆节点 CSS 上。SVG 导出 SHALL 包含完整样式（颜色、字体、边框），可被矢量编辑工具（Figma、Illustrator、Inkscape）打开编辑。

#### Scenario: Export full mindmap as SVG
- **WHEN** 用户点击导出 → SVG
- **THEN** 系统计算所有节点边界框，生成完整脑图 SVG 文件并触发浏览器下载
- **AND** 画布视口保持不变

#### Scenario: SVG preserves node styling
- **WHEN** 导出 SVG 文件
- **THEN** SVG 中节点样式（颜色、圆角、阴影、字体大小）与画布显示一致
