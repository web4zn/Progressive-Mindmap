## ADDED Requirements

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

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Generate mindmap from conversation history

*（已移除）*

#### Scenario: Full regeneration from conversation
- **WHEN** 用户发送消息触发脑图生成
- **THEN** 系统构建包含现有树上下文的 prompt，LLM 输出完整树结构，`mergeEditedNodes` 保护用户编辑

#### Scenario: AI generates node with markdown content
- **WHEN** 语料包含代码示例
- **THEN** LLM 输出的节点可能包含带 `contentType: 'markdown'` 的 `content` 字段（含代码块或表格）
- **AND** 系统正确解析并存储 `contentType` 和 `content` 字段

### Requirement: Depth and breadth constraints

*（已移除）*

#### Scenario: LLM returns deep tree beyond old limit
- **WHEN** LLM 返回 8 层深的树结构
- **THEN** 解析器完整保留所有 8 层节点，不做截断

#### Scenario: LLM returns many children per node
- **WHEN** LLM 返回某个节点有 15 个直接子节点
- **THEN** 解析器完整保留所有 15 个子节点，不做截断

#### Scenario: Existing tree data unaffected
- **WHEN** 旧持久化数据被加载
- **THEN** 系统正常渲染，现有树结构不受影响

### Requirement: Few-shot prompt examples

*（已移除）*

### Requirement: Structured JSON output (preferred format)

*（已移除）*

#### Scenario: JSON mode supported
- **WHEN** 当前 provider 的 `apiEndpoint` 匹配已知支持列表（OpenAI/DeepSeek/SiliconFlow/OpenRouter/Google）
- **THEN** 系统使用 `response_format: { type: "json_object" }` 请求

#### Scenario: JSON parse failure
- **WHEN** LLM 返回非 JSON 内容或 JSON 解析失败
- **THEN** 系统保持当前树结构不变，不触发树更新
