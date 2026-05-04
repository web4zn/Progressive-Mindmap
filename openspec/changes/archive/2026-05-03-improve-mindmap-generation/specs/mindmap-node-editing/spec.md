## ADDED Requirements

### Requirement: Inline edit node label and summary
系统 SHALL 允许用户通过双击节点进入编辑模式。编辑模式下 label 和 summary 变为可编辑输入框。用户 SHALL 可以按 Enter 或点击其他区域确认编辑，按 Escape 取消编辑。

#### Scenario: Double-click to edit node
- **WHEN** 用户双击脑图树中的某个节点
- **THEN** 该节点的 label 和 summary 切换为可编辑输入框，自动聚焦到 label

#### Scenario: Confirm edit with Enter
- **WHEN** 用户在编辑模式下修改 label 后按 Enter
- **THEN** 修改保存到节点数据，输入框切换回只读文本，节点标记 `editedByUser: true`

#### Scenario: Cancel edit with Escape
- **WHEN** 用户在编辑模式下按 Escape
- **THEN** 编辑取消，节点恢复原始 label 和 summary

#### Scenario: Click outside to confirm
- **WHEN** 用户在编辑模式下点击节点外的任意区域
- **THEN** 修改保存到节点数据，编辑模式退出

### Requirement: Add child node
系统 SHALL 允许用户通过右键菜单在当前节点下添加新的子节点。新节点 SHALL 创建后自动进入编辑模式。

#### Scenario: Add child via context menu
- **WHEN** 用户在节点上右键选择「添加子节点」
- **THEN** 系统创建新的空节点（label 为 "新节点"，summary 为空）作为该节点的子节点，追加到 children 数组末尾，自动展开父节点，新节点进入编辑模式

### Requirement: Delete node
系统 SHALL 允许用户通过右键菜单删除节点。删除前 SHALL 显示确认提示。删除节点 SHALL 同时删除其所有子孙节点。

#### Scenario: Delete node with confirmation
- **WHEN** 用户在节点上右键选择「删除节点」，确认删除
- **THEN** 该节点及其所有子节点从树中移除

### Requirement: Move node via context menu
系统 SHALL 允许用户通过右键菜单将节点在同级内上移或下移（排序）。

#### Scenario: Move node up within siblings
- **WHEN** 用户在节点的右键菜单选择「上移」
- **THEN** 该节点在父节点的 children 数组中向前移动一位

#### Scenario: Move node down within siblings
- **WHEN** 用户在节点的右键菜单选择「下移」
- **THEN** 该节点在父节点的 children 数组中向后移动一位

### Requirement: Edited node preservation during sync
系统 SHALL 在自动同步或手动同步时保护用户编辑过的节点。`editedByUser: true` 的节点 SHALL 不被 LLM 生成的内容覆盖。同步完成后，用户编辑的节点 SHALL 保留，仅在 LLM 输出的树中无对应节点时被标记为「已脱离图谱」（orphan）。

#### Scenario: Auto-sync preserves user edits
- **WHEN** 用户编辑了节点 A 的 label，随后自动同步触发
- **THEN** 节点 A 保留用户编辑的内容，`editedByUser` 保持 true

#### Scenario: Manual sync offers overwrite option
- **WHEN** 用户点击「更新图谱」，存在 `editedByUser: true` 的节点
- **THEN** 系统弹出提示：「存在手动编辑的节点，是否用 AI 生成内容覆盖？」用户可选择「覆盖」或「保留」
