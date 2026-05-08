## MODIFIED Requirements

### Requirement: Structured JSON output (preferred format)
系统 SHALL 始终使用 JSON mode 约束 LLM 输出结构化 JSON（当 provider 支持 `response_format: json_object` 时）。系统 SHALL NOT 使用 `<!--MINDMAP-->` HTML 注释标记模式。JSON 解析 SHALL 直接使用 `JSON.parse`，不做多阶段容错修复或 Markdown 回退。解析失败时 SHALL 保持当前树不变。

#### Scenario: JSON mode supported
- **WHEN** 当前 provider 的 `apiEndpoint` 匹配已知支持列表（OpenAI/DeepSeek/SiliconFlow/OpenRouter/Google）
- **THEN** 系统使用 `response_format: { type: "json_object" }` 请求

#### Scenario: JSON parse failure
- **WHEN** LLM 返回非 JSON 内容或 JSON 解析失败
- **THEN** 系统保持当前树结构不变，不触发树更新

## REMOVED Requirements

### Requirement: Markdown to tree parsing
**Reason**: Markdown 解析仅用于 `<!--MINDMAP-->` marker mode 的 JSON 回退路径。该路径已被移除。
**Migration**: 无需迁移。JSON mode 始终产生可直接 `JSON.parse` 的结构化输出。
