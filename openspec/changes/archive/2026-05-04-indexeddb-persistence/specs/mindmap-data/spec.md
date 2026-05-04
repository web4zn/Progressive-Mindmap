## MODIFIED Requirements

### Requirement: MindMap persistence
系统 SHALL 将思维导图数据持久化到浏览器 IndexedDB。持久化 SHALL 通过 Zustand persist 中间件 + `createIndexedDBStorage()` 适配器实现。数据 SHALL 在页面刷新后完整恢复。

#### Scenario: Persistence across page reload
- **WHEN** 用户刷新页面或关闭后重新打开应用
- **THEN** 所有已创建的思维导图及其树结构从 IndexedDB 完整恢复
