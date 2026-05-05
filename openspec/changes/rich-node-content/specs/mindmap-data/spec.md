## MODIFIED Requirements

### Requirement: MindMapNode data model
MindMapNode SHALL 包含以下字段：`id: string`（唯一标识）、`label: string`（节点标题）、`summary: string`（纯文本摘要）、`content?: string`（可选 Markdown 内容）、`contentType?: 'text' | 'markdown'`（可选内容类型，默认 `'text'`）、`children: MindMapNode[]`（子节点）、`sourceConversationIds: string[]`（来源对话 ID）、`sourceExcerpts: Record<string, string>`（来源摘录）、`editedByUser: boolean`（是否被用户编辑）。

#### Scenario: New node with markdown content
- **WHEN** 创建 MindMapNode 且指定 `contentType: 'markdown'` 和 `content: '## Title\n\nContent'`
- **THEN** 节点存储完整 Markdown 内容且类型标记为 markdown

#### Scenario: Existing node remains compatible
- **WHEN** 现有节点（无 `contentType` 和 `content` 字段）被反序列化
- **THEN** 节点正常加载，`contentType` 默认为 `'text'`，行为与旧版本一致
