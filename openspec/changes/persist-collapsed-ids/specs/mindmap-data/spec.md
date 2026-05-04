## MODIFIED Requirements

### Requirement: MindMap 持久化折叠状态
The MindMap entity SHALL persist user's collapsed/expanded node state across sessions via `collapsedNodeIds` field.

#### Scenario: 折叠后刷新恢复
- **WHEN** 用户折叠某节点后刷新页面
- **THEN** 该节点保持折叠状态

#### Scenario: 切换脑图状态隔离
- **WHEN** 用户切换到另一个脑图
- **THEN** 每个脑图独立保留各自的折叠状态

#### Scenario: 旧数据兼容
- **WHEN** 加载没有 `collapsedNodeIds` 字段的旧 MindMap 数据
- **THEN** 所有节点默认展开，不报错
