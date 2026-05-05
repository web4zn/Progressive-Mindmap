## ADDED Requirements

### Requirement: Export mindmap as SVG
系统 SHALL 支持将当前脑图画布导出为 SVG 矢量图文件。SVG 导出 SHALL 包含完整样式（颜色、字体、边框），可被矢量编辑工具（Figma、Illustrator、Inkscape）打开编辑。

#### Scenario: Export full mindmap as SVG
- **WHEN** 用户点击导出 → SVG
- **THEN** 系统自动展开所有折叠节点，生成完整脑图 SVG 文件并触发浏览器下载
- **AND** 折叠状态恢复为导出前的状态

#### Scenario: SVG preserves node styling
- **WHEN** 导出 SVG 文件
- **THEN** SVG 中节点样式（颜色、圆角、阴影、字体大小）与画布显示一致
