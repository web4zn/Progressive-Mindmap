## ADDED Requirements

### Requirement: Select conversation messages as mindmap input
系统 SHALL 允许用户从对话历史中选择特定消息作为脑图生成的输入源。用户 SHALL 可以通过点击消息旁的勾选框选中整条消息，或选中消息内部分文本后右键「加入脑图物料」。选中的内容 SHALL 存储到物料池中（Zustand `useMaterialStore`）。

#### Scenario: Select entire message via checkbox
- **WHEN** 用户在对话消息旁点击勾选按钮
- **THEN** 该消息被添加到物料池，显示选中状态（高亮边框），勾选框状态变为已选中

#### Scenario: Deselect message
- **WHEN** 用户再次点击已选中消息的勾选按钮
- **THEN** 该消息从物料池移除，高亮边框消失

#### Scenario: Select text fragment as material
- **WHEN** 用户在消息中选中部分文本，右键选择「加入脑图物料」
- **THEN** 选中的文本片段作为一条物料项添加到物料池，标注来源消息 ID 和原文位置

#### Scenario: Clear all materials
- **WHEN** 用户点击物料池中的「清空」按钮
- **THEN** 所有物料项被移除，消息选中状态全部清除

### Requirement: Material pool panel
系统 SHALL 在脑图面板中提供「物料池」区域，列出所有待处理的物料项。列表 SHALL 显示每个物料的来源对话标题、消息摘要（截断至 60 字符）和添加时间。用户 SHALL 可以单独删除某个物料项。

#### Scenario: Open material pool
- **WHEN** 用户打开脑图面板
- **THEN** 物料池区域显示在工具栏下方，列出所有已选中的物料项

#### Scenario: Material pool empty
- **WHEN** 用户尚未选中任何消息或文本片段
- **THEN** 物料池显示「暂无物料，从对话中选择内容添加」提示

#### Scenario: Drag message to material pool
- **WHEN** 用户将一条消息拖拽到脑图面板区域
- **THEN** 该消息添加到物料池

### Requirement: Generate mindmap from selected materials
系统 SHALL 在用户点击「更新图谱」时，优先使用物料池中的内容作为 LLM 输入。如果物料池非空，仅将物料项对应的文本内容发送给 LLM；如果物料池为空，SHALL 降级为使用全部关联对话（当前行为）。

#### Scenario: Generate from materials
- **WHEN** 物料池包含 3 条选中消息，用户点击「更新图谱」
- **THEN** 系统仅将 3 条消息的文本发送给 LLM，不包含其他对话消息

#### Scenario: Generate with no materials
- **WHEN** 物料池为空，用户点击「更新图谱」
- **THEN** 系统降级为使用全部关联对话作为输入（保持向后兼容）
