## Purpose

Enable AI-powered mindmap generation and incremental updates from conversation material: a ReAct Agent running in a Web Worker emits validated operations, and user-edited nodes are preserved.

## Requirements

### Requirement: Generation state management

系统 SHALL 在 Agent 生成过程中管理以下状态：`idle`、`thinking`、`reading_mindmap`、`reading_node`、`generating_mindmap`、`complete`、`error`。

`thinking`、`reading_mindmap`、`reading_node`、`generating_mindmap` SHALL 被视为进行中状态；处于进行中状态且没有可流式展示的树内容时，脑图面板 SHALL 显示加载指示器（旋转图标 + 骨架屏）与“生成中”状态。非 `idle` 状态 SHALL 由 `AgentActivityPanel` 以图标、中文标签与可选消息展示。

`complete` 与 `error` SHALL 被视为终态：系统 SHALL 在 5 秒后自动将其回落到 `idle`；若期间发生了新的状态转换，则原定的回落 SHALL 被取消。

#### Scenario: Generating state
- **WHEN** Agent 状态为 `thinking`、`reading_mindmap`、`reading_node` 或 `generating_mindmap`
- **THEN** 脑图面板显示加载动画（旋转图标 + 骨架屏）和“生成中”状态
- **AND** `AgentActivityPanel` 显示对应的中文状态标签

#### Scenario: Generation error
- **WHEN** LLM 调用失败或 Worker 报告错误
- **THEN** Agent 状态变为 `error` 并显示错误消息
- **AND** 系统保留最后一次成功渲染的树结构不变

#### Scenario: Terminal state auto-reverts to idle
- **WHEN** Agent 状态进入 `complete` 或 `error`，且 5 秒内没有发生新的状态转换
- **THEN** 状态自动回落到 `idle`
- **AND** 若期间发生了新的状态转换，则原定的回落被取消

### Requirement: Quality validation
系统 SHALL 在生成完成后执行质量校验：重复节点、空节点。警告 SHALL 以非阻塞形式显示。

> 注：当前未实现生成后质量校验逻辑。

#### Scenario: Duplicate node detected
- **WHEN** 生成结果包含 label 完全相同的同级节点
- **THEN** 系统输出警告但不自动修改树结构

### Requirement: Agent-driven mindmap generation from conversation material

系统 SHALL 通过运行在 Web Worker 中的 ReAct Agent 从对话材料生成与更新思维导图。生成路径 SHALL NOT 输出或应用全量树结构；所有树变更 SHALL 以 `MindmapOperation` 增量操作表达，并经 `applyOperations` 应用。

Agent SHALL 通过工具 `generateMindmapOps` 提交操作。工具调用 SHALL 以 Worker → 主线程消息往返的形式执行（`TOOL_RESULT_NEEDED` / `TOOL_RESULT`），工具结果 SHALL 回灌到 ReAct 循环的上下文中。主线程 SHALL 先用 Zod schema 校验操作、再由 `applyOperations` 应用到当前树；`applyOperations` SHALL 是唯一的树写入通道。

Agent 的上下文 SHALL 包含最近对话消息与 `mindmapTreeToFlatContext` 生成的扁平树文本。扁平树文本 SHALL 为每个节点包含 `[id: <nodeId>]`、反映层级的缩进，并在用户编辑过的节点上附加 `[用户编辑]` 标记；该文本 SHALL 最多包含 200 个节点。`editedByUser: true` 的节点 SHALL NOT 被覆盖或删除。

#### Scenario: Generate new concept from conversation
- **WHEN** 对话中出现当前脑图尚未覆盖的新概念
- **THEN** Agent 调用 `generateMindmapOps` 提交 `add_child` 操作，其 `parentId` 引用扁平上下文中真实存在的节点 ID
- **AND** 主线程校验并应用该操作后，新节点出现在目标父节点下，树的其余部分保持不变

#### Scenario: Empty mindmap starts with add_root
- **WHEN** 关联脑图为空（上下文为 `(空白脑图)`）且 Agent 识别出第一个根概念
- **THEN** Agent 调用 `generateMindmapOps` 提交 `add_root` 操作
- **AND** `applyOperations` 将该节点加入根层级

#### Scenario: User-edited nodes are not overwritten
- **WHEN** Agent 对一个 `editedByUser: true` 的节点提交 `update` 或 `delete_leaf`，或在该节点下提交 `add_child`
- **THEN** `applyOperations` 跳过该操作并原样保留节点
- **AND** 用户编辑的内容保持不变

#### Scenario: No-change run terminates with zero operations
- **WHEN** 对话中没有需要补充的新信息
- **THEN** Agent 调用 `generateMindmapOps` 并传入空的 `operations` 数组
- **AND** ReAct 循环在收到 0 操作结果后结束，脑图保持不变

