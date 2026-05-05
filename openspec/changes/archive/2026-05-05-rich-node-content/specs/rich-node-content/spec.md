## ADDED Requirements

### Requirement: Markdown node content
系统 SHALL 支持节点包含 Markdown 格式的富文本内容。MindMapNode SHALL 新增可选字段 `contentType?: 'text' | 'markdown'` 和 `content?: string`。当 `contentType` 为 `'markdown'` 时，`content` SHALL 被渲染为 Markdown；为 `'text'` 或未设置时，行为与当前一致。

#### Scenario: Node with markdown content renders images
- **WHEN** 节点 `contentType` 为 `'markdown'` 且 `content` 包含 `![](url)` 图片语法
- **THEN** 画布上该节点展示渲染后的图片

#### Scenario: Node without contentType renders as plain text
- **WHEN** 节点未设置 `contentType` 字段
- **THEN** 节点渲染行为与当前版本完全一致

### Requirement: LaTeX formula rendering
系统 SHALL 在 Markdown 节点内容中支持 LaTeX 数学公式渲染。使用 `$...$` 语法渲染行内公式，`$$...$$` 语法渲染块级公式。

#### Scenario: Inline LaTeX in node content
- **WHEN** 节点 `contentType` 为 `'markdown'` 且 `content` 包含 `$E=mc^2$`
- **THEN** 画布上该节点展示渲染后的行内公式

### Requirement: Markdown editing with preview
节点编辑 Modal SHALL 支持 Markdown 内容的编辑与预览切换。当节点 `contentType` 为 `'markdown'` 时，编辑框 SHALL 显示 Markdown 源码，并提供「预览」按钮切换为渲染后的效果。

#### Scenario: Toggle edit/preview in modal
- **WHEN** 用户双击节点进入编辑模式，且该节点 `contentType` 为 `'markdown'`
- **THEN** Modal 中显示 Markdown 源码编辑器，并提供预览切换按钮
- **AND** 点击预览后展示渲染后的 Markdown 效果
