## MODIFIED Requirements

### Requirement: Depth and breadth constraints
系统 SHALL 限制图谱生成的树深度（最多 N 层，N 由图谱的 `maxDepth` 配置决定，默认为 3，可配置为 1-5 或自动模式）和每层节点数（最多 10 个直接子节点）。LLM prompt 中 SHALL 明确这些限制。

#### Scenario: Max depth enforcement at configured depth
- **WHEN** 图谱 `maxDepth` 为 4，LLM 返回超过 4 层的标题（如 #####）
- **THEN** 解析器忽略第五层及更深层的标题

#### Scenario: Breadth constraint enforcement
- **WHEN** LLM 返回某个节点超过 10 个直接子节点
- **THEN** 系统仅保留前 10 个，超出部分忽略

#### Scenario: Auto mode depth
- **WHEN** 图谱为自动模式（maxDepth = 0），LLM 返回任意深度内容
- **THEN** prompt 不指定层数限制，解析器安全上限为 6 层
