## MODIFIED Requirements

### Requirement: Provider data model
系统 SHALL 使用以下数据模型表示模型提供商。Provider SHALL 包含字段：`id: string`（唯一标识）、`name: string`（显示名称）、`endpoint: string`（API 端点）、`apiKey: string`（API 密钥）、`models: Model[]`（模型列表）、`preset?: boolean`（可选，标记为系统预置，预置提供商不可删除）、`createdAt: number`（创建时间戳）、`updatedAt: number`（更新时间戳）。

#### Scenario: Preset provider has preset flag
- **WHEN** 预置提供商被创建
- **THEN** `preset` 字段为 `true`

#### Scenario: User-created provider has no preset flag
- **WHEN** 用户手动添加提供商
- **THEN** `preset` 字段为 `undefined` 或 `false`
