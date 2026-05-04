## ADDED Requirements

### Requirement: Configurable mindmap depth
系统 SHALL 支持用户为每个图谱配置生成深度。`maxDepth` 字段 SHALL 接受 3-5 的整数或 0（自动模式）。默认值 SHALL 为 3。图谱设置 UI SHALL 提供深度选择器，选项为 3 层、4 层、5 层、自动。

#### Scenario: Set depth to 4
- **WHEN** 用户在图谱设置中将最大深度设为 4
- **THEN** 生成 prompt 告知模型最大深度为 4 层，解析器接受最多 4 层标题

#### Scenario: Set depth to auto
- **WHEN** 用户在图谱设置中选择「自动」模式（maxDepth = 0）
- **THEN** 生成 prompt 不指定具体深度限制，告知模型根据内容密度自行判断，解析器安全上限为 6 层

#### Scenario: Default depth for existing mindmap
- **WHEN** 旧图谱的 `maxDepth` 为 undefined
- **THEN** 系统使用默认深度 3 层

### Requirement: Depth parameter propagation
生成链条中的所有函数 SHALL 接受 `maxDepth` 参数：
- `buildSystemPrompt(maxDepth)`：prompt 中替换硬编码的 3
- `parseMarkdownToTree(markdown, sourceMap?, maxDepth?)`：正则和 stack 判断参数化
- `jsonNodeToMindMapNode(item, sourceMap?, depth, maxDepth?)`：递归深度判断参数化
- `generateMindmap` 从 MindMap.maxDepth 获取值传递给上述函数

#### Scenario: Prompt reflects configured depth
- **WHEN** 图谱 `maxDepth` 为 4，触发生成
- **THEN** system prompt 包含「最大深度为 4 层（# / ## / ### / ####）」

#### Scenario: Parser respects configured depth
- **WHEN** 图谱 `maxDepth` 为 4，LLM 返回包含 #### 的内容
- **THEN** 解析器正确处理 #### 作为第四层节点

#### Scenario: Parser enforces safety cap in auto mode
- **WHEN** 图谱为自动模式，LLM 返回超过 6 层的内容
- **THEN** 解析器忽略第 7 层及更深层标题

### Requirement: Depth selection UI
系统 SHALL 在图谱设置弹窗和工具栏中提供深度选择 UI。工具栏 SHALL 在「更新图谱」按钮旁显示紧凑下拉，选项包括：3 层、4 层、5 层、「自动（模型判断）」。切换时 SHALL 即时保存，无需进入设置弹窗。设置弹窗中 SHALL 同步显示当前选择。

#### Scenario: Quick switch depth from toolbar
- **WHEN** 用户在工具栏下拉选择「4 层」
- **THEN** 图谱 `maxDepth` 立即更新为 4，下次生成使用 4 层深度

#### Scenario: Toolbar and settings dialog in sync
- **WHEN** 用户在工具栏将深度从 3 改为 4，随后打开设置弹窗
- **THEN** 设置弹窗中显示当前深度为 4
