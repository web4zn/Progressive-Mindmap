## MODIFIED Requirements

### Requirement: Stop generation
系统 SHALL 在 LLM 生成响应期间提供"停止生成"按钮。点击后 SHALL 立即终止流式传输，保留已生成的部分内容。系统 SHALL 正确检测 OpenAI SDK 的 abort 错误（通过 AbortSignal 状态判断），不应依赖错误类型的 name 属性匹配。

#### Scenario: User stops generation
- **WHEN** 用户在 AI 响应生成期间点击停止按钮
- **THEN** 流式传输立即终止，已生成的部分内容保留显示且状态为 complete，停止按钮消失

#### Scenario: Abort detection
- **WHEN** 流式传输因 AbortSignal 被中止
- **THEN** 系统通过 signal.aborted 状态正确检测到中止，不将中止错误标记为错误
