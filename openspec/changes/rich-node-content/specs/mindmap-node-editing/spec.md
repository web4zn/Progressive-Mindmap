## MODIFIED Requirements

### Requirement: Node edit mode
系统 SHALL 允许用户双击节点进入编辑模式。编辑模式下 SHALL 弹出居中 Modal 弹窗（`MindMapEditModal`），包含 label 输入框、summary 文本域，以及当 `contentType` 为 `'markdown'` 时的 content Markdown 编辑器与预览切换按钮。按 Enter 确认编辑并调用 `mindmapStore.updateNode`，按 Escape 或点击 Modal 外区域取消编辑。确认后节点 `editedByUser` 标记为 true。

#### Scenario: Edit markdown node with preview
- **WHEN** 用户双击 `contentType` 为 `'markdown'` 的节点
- **THEN** Modal 显示 label 输入框、summary 文本域、Markdown 内容编辑器和预览切换按钮
- **AND** 点击预览按钮后，Markdown 内容在预览区渲染展示
