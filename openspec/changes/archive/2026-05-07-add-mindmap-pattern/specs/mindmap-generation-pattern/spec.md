## ADDED Requirements

### Requirement: Mindmap generation pattern
系统 SHALL 支持在创建脑图时选择知识组织模式（pattern）。可选 SHALL 包括：

- `"auto"`: 无限制，LLM 自行决定知识组织方式（当前行为）
- `"5w1h"`: What / Why / Who / When / Where / How 六维度
- `"tech"`: 定义 → 原理 → 使用场景 → 对比/注意事项
- `"pros-cons"`: 优点 → 缺点 → 适用场景

Pattern SHALL 通过 `MindMap.pattern` 字段持久化。旧脑图无此字段时 SHALL 视为 `"auto"`。

#### Scenario: Create mindmap with 5W1H pattern
- **WHEN** 用户创建新脑图并选择 5W1H 模式
- **THEN** 脑图记录 `pattern: "5w1h"`，后续生成 prompt 注入 5W1H 指令

#### Scenario: Default pattern is auto
- **WHEN** 用户创建新脑图且未选择 pattern
- **THEN** 使用 `"auto"` 模式，行为与之前版本一致

#### Scenario: Legacy mindmap without pattern field
- **WHEN** 旧脑图数据加载，`pattern` 字段为 undefined
- **THEN** 系统将其视为 `"auto"` 模式

### Requirement: Pattern injection into generation prompt
`buildFullMindmapPrompt(pattern)` SHALL 根据 pattern 值注入对应的知识组织指令：

- `auto`: 仅当前指令，无额外约束
- `5w1h`: 追加「按 5W1H 六维度组织知识：What（定义）、Why（原因）、Who（相关方）、When（时机）、Where（场景）、How（方法）」
- `tech`: 追加「按技术概念模式组织：先给定义和核心原理，再展开使用场景，最后对比同类方案或列出注意事项」
- `pros-cons`: 追加「按优缺点模式组织：先列举优点和优势场景，再列举缺点和局限性，最后给出适用场景判断」

#### Scenario: 5W1H pattern prompt
- **WHEN** 脑图 pattern 为 `"5w1h"`
- **THEN** system prompt 包含 5W1H 六维度的组织指令

### Requirement: Pattern selection UI
系统 SHALL 在新建脑图时提供 pattern 选择控件（NewConversationDialog）。脑图面板 SHALL 显示当前使用的 pattern。

#### Scenario: Select pattern when creating mindmap
- **WHEN** 用户在 NewConversationDialog 中选择"创建新图谱"
- **THEN** 显示 pattern 下拉选择框，选项为 自动/5W1H/技术概念/优缺点分析

#### Scenario: Display pattern in panel
- **WHEN** 脑图面板渲染活跃脑图
- **THEN** 工具栏中显示当前 pattern 名称（如 "5W1H"）
