## MODIFIED Requirements

### Requirement: Generate mindmap from conversation history
系统 SHALL 支持通过 LLM 从对话内容生成思维导图树结构。输入内容 SHALL 优先使用图谱语料库内容。生成模式 SHALL 根据图谱状态自动选择：首次生成使用全量模式（输出完整 Markdown/JSON 树），后续生成使用增量模式（输出操作指令）。增量模式 SHALL 提供旧树摘要而非完整树，减少 prompt token 消耗。

#### Scenario: First-time generation
- **WHEN** 用户对未包含树的图谱触发生成
- **THEN** 系统使用全量模式，构建完整 prompt，LLM 输出完整树结构

#### Scenario: Incremental generation
- **WHEN** 图谱已有树结构，用户传入新内容触发生成
- **THEN** 系统使用增量模式，提供旧树摘要，LLM 输出操作指令

### Requirement: Incremental update via full regeneration
系统 SHALL 保留全量再生作为降级路径。当增量操作解析失败时，SHALL 自动降级到全量 Markdown 再生。`editedByUser: true` 的节点 SHALL 在操作执行器中被保护不被覆盖。用户 SHALL 可通过设置强制选择「全量重建」。

#### Scenario: Tree grows across multiple sessions
- **WHEN** 同一个图谱关联了 3 个 Conversation，每个对话涉及同一主题的不同方面
- **THEN** 触发同步后，增量操作整合新知识点，保持已有结构稳定

#### Scenario: Full rebuild on demand
- **WHEN** 用户在图谱设置中选择「全量重建」模式并触发生成
- **THEN** 系统使用全量 prompt 重新生成完整树
