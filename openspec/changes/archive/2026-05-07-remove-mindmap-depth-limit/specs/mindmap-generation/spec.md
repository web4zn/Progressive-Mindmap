## MODIFIED Requirements

### Requirement: Depth and breadth constraints
系统 SHALL NOT 在解析阶段对 LLM 生成的脑图施加硬编码深度上限或每节点子节点数量上限。`parseJsonToTree` 和 `jsonNodeToMindMapNode` SHALL 接受 LLM 返回的任意深度树结构和任意子节点数量，不做截断。

`mindmapTreeToContext` 中的 `maxNodes=200` 序列化截断 SHALL 保持不变（这是 prompt 上下文限制，而非树结构限制）。

#### Scenario: LLM returns deep tree beyond old limit
- **WHEN** LLM 返回 8 层深的树结构
- **THEN** 解析器完整保留所有 8 层节点，不做截断

#### Scenario: LLM returns many children per node
- **WHEN** LLM 返回某个节点有 15 个直接子节点
- **THEN** 解析器完整保留所有 15 个子节点，不做截断

#### Scenario: Existing tree data unaffected
- **WHEN** 旧持久化数据被加载
- **THEN** 系统正常渲染，现有树结构不受影响
