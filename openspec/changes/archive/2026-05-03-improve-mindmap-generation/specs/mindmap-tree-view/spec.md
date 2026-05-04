## MODIFIED Requirements

### Requirement: Loading and error states
系统 SHALL 在面板中显示生成过程中的流式渲染状态和错误状态。生成中 SHALL 实时更新树视图（而非仅显示骨架屏）。

#### Scenario: Generating state
- **WHEN** 图谱正在生成中
- **THEN** 树视图区实时渲染部分树，面板顶部显示进度信息「已生成 N 个主题 · 深度 X/3」，同步按钮禁用

#### Scenario: Error state
- **WHEN** 图谱生成失败
- **THEN** 面板显示错误消息、错误描述文字和"重试"按钮，保留最后一次成功渲染的树

## ADDED Requirements

### Requirement: Node edit mode UI
系统 SHALL 在节点编辑模式下渲染可编辑输入框。label 输入框 SHALL 自动聚焦。summary 输入框 SHALL 为可选的多行文本域。编辑区 SHALL 有视觉区分（蓝色边框或浅蓝背景）。

#### Scenario: Edit mode visual distinction
- **WHEN** 用户双击节点进入编辑模式
- **THEN** label 区域变为带蓝色焦点边框的输入框，summary 下方出现多行文本域，节点背景变为浅蓝色

#### Scenario: Exit edit mode on blur
- **WHEN** 用户点击编辑区外的任意位置
- **THEN** 编辑保存，输入框恢复为只读文本

### Requirement: Context menu for node operations
系统 SHALL 在节点上右键时显示上下文菜单。菜单 SHALL 包含以下操作项：编辑、添加子节点、上移、下移、升级、降级、删除。不可用的操作项（如根节点无法上移）SHALL 显示为禁用状态。

#### Scenario: Context menu on root node
- **WHEN** 用户在根节点上右键
- **THEN** 菜单显示：「编辑」「添加子节点」「删除」，上移/下移/升级/降级 显示为禁用

#### Scenario: Context menu on leaf node
- **WHEN** 用户在叶子节点上右键
- **THEN** 菜单显示：「编辑」「添加子节点」「上移」「下移」「升级」「降级」「删除」

### Requirement: Material selection indicator on messages
系统 SHALL 在对话消息被选中为物料时显示视觉指示。指示 SHALL 包含：消息左侧蓝色边框、勾选框对勾状态、消息右上角「已选为物料」标签。

#### Scenario: Selected message indicator
- **WHEN** 用户勾选某条消息
- **THEN** 消息左侧出现蓝色边框，勾选框显示对勾，右上角出现蓝色「已选为物料」标签

#### Scenario: Deselected message removes indicator
- **WHEN** 用户取消勾选
- **THEN** 蓝色边框、对勾和标签全部移除，恢复默认样式

### Requirement: Streaming tree rendering UI
系统 SHALL 在流式渲染模式下为尚未完成的节点添加视觉提示（如虚线边框或「生成中…」尾缀），与已完成的节点区分开。

#### Scenario: Streaming node visual cue
- **WHEN** 流式生成中，某节点是当前累积文本的最后一个叶子节点
- **THEN** 该节点 summary 末尾显示「…」或节点边框为虚线，表示可能还有后续内容

#### Scenario: Complete tree removes streaming cues
- **WHEN** 生成完成
- **THEN** 所有虚线边框和「…」尾缀移除，树恢复完整样式
