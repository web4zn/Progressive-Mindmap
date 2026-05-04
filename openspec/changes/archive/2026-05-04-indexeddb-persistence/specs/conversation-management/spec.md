## MODIFIED Requirements

### Requirement: Conversation persistence
系统 SHALL 将会话数据持久化到 IndexedDB，通过 Zustand persist + `createIndexedDBStorage()` 实现。刷新后完整恢复。

#### Scenario: Persistence across page reload
- **WHEN** 用户刷新页面
- **THEN** 所有会话和历史消息从 IndexedDB 完整恢复
