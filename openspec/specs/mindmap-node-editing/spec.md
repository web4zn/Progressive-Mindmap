## Purpose

Allow users to edit mindmap node labels, summaries, and Markdown content through a modal dialog, with validation and user-edit tracking.

## Requirements

### Requirement: Node edit mode
系统 SHALL 允许用户双击节点进入编辑模式。编辑模式下 SHALL 弹出居中 Modal 弹窗（`MindMapEditModal`），包含 label 输入框、summary 文本域，以及当 `contentType` 为 `'markdown'` 时的 content Markdown 编辑器与预览切换按钮。按 Enter 确认编辑并调用 `mindmapStore.updateNode`，按 Escape 或点击 Modal 外区域取消编辑。确认后节点 `editedByUser` 标记为 true。

#### Scenario: Double-click to edit node
- **WHEN** 用户双击画布中的某个节点
- **THEN** 弹出居中 Modal，包含 label 输入框和 summary 文本域，自动聚焦到 label

#### Scenario: Confirm edit with Enter
- **WHEN** 用户在编辑模式下修改 label 后按 Enter
- **THEN** 修改通过 `mindmapStore.updateNode` 保存，Modal 关闭

#### Scenario: Cancel edit with Escape
- **WHEN** 用户在编辑模式下按 Escape
- **THEN** Modal 关闭，节点恢复原始内容

#### Scenario: Click outside to cancel
- **WHEN** 用户在编辑模式下点击 Modal 外的遮罩层
- **THEN** 编辑取消，Modal 关闭

### Requirement: Node context menu
系统 SHALL 在节点上右键时弹出 `MindMapContextMenu`（Portal 到 body）。菜单 SHALL 包含：编辑、添加子节点、上移、下移、删除（带二次确认）。不可用的操作项 SHALL 显示为禁用。

#### Scenario: Context menu at click location
- **WHEN** 用户在节点上右键
- **THEN** 右键菜单在鼠标位置弹出

#### Scenario: Add child via context menu
- **WHEN** 用户右键选择「添加子节点」
- **THEN** `mindmapStore.addChildNode` 调用，新节点创建后 dagre 重新布局
