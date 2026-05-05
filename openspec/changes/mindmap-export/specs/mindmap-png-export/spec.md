## ADDED Requirements

### Requirement: Export mindmap as PNG
系统 SHALL 支持将当前脑图画布导出为 PNG 图片文件。导出 SHALL 自动展开所有折叠节点，重新计算布局后截图，完成后再恢复原始折叠状态。导出 SHALL 支持 1x / 2x / 3x 像素密度选择，默认 2x。

#### Scenario: Export full mindmap as 2x PNG
- **WHEN** 用户点击导出 → PNG 2x
- **THEN** 系统自动展开所有折叠节点，计算完整布局，截取完整画布生成 2x PNG 并触发浏览器下载
- **AND** 折叠状态恢复为导出前的状态

#### Scenario: Export with folded nodes
- **WHEN** 脑图中有部分节点处于折叠状态，用户导出 PNG
- **THEN** 导出图片包含完整脑图（折叠节点在导出中展开），但画布显示恢复折叠状态

### Requirement: PNG resolution options
系统 SHALL 在导出菜单中提供 PNG 1x / PNG 2x / PNG 3x 三种分辨率选择。1x 对应屏幕分辨率，2x 为 Retina 分辨率（默认），3x 为高清打印。

#### Scenario: Select PNG 3x for print
- **WHEN** 用户选择导出 → PNG 3x
- **THEN** 下载的 PNG 图片分辨率为原始画布的 3 倍像素密度
