## Purpose

脑图可视化 PNG 导出能力，支持多分辨率。

## ADDED Requirements

### Requirement: Export mindmap as PNG
系统 SHALL 支持将当前脑图画布导出为 PNG 图片文件。导出 SHALL 通过 React Flow 的 `getNodes()` + `getNodesBounds()` + `getViewportForBounds()` 计算完整脑图的最优视口变换，将 transform 覆写到 `html-to-image` 克隆节点的 CSS 上，确保导出完整脑图同时不影响实时视口。导出 SHALL 支持 1x / 2x / 3x 像素密度选择，默认 2x。

#### Scenario: Export full mindmap as 2x PNG
- **WHEN** 用户点击导出 → PNG 2x
- **THEN** 系统计算所有节点边界框，生成完整脑图 2x PNG 并触发浏览器下载
- **AND** 画布视口保持不变

#### Scenario: Export while zoomed in
- **WHEN** 用户放大画布到局部，点击导出 PNG
- **THEN** 导出图片包含完整脑图，画布视口不受影响

### Requirement: PNG resolution options
系统 SHALL 在导出菜单中提供 PNG 1x / PNG 2x / PNG 3x 三种分辨率选择。1x 对应屏幕分辨率，2x 为 Retina 分辨率（默认），3x 为高清打印。

#### Scenario: Select PNG 3x for print
- **WHEN** 用户选择导出 → PNG 3x
- **THEN** 下载的 PNG 图片分辨率为原始画布的 3 倍像素密度
