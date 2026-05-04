## MODIFIED Requirements

### Requirement: IndexedDB 初始化失败时应用不崩溃
The system SHALL handle IndexedDB initialization failure gracefully, allowing the application to render and function in memory-only mode.

#### Scenario: IndexedDB 不可用时正常渲染
- **WHEN** 浏览器不支持 IndexedDB 或在隐私模式下拒绝访问
- **THEN** 应用正常渲染，使用初始 state 运行
- **AND** 控制台输出 IndexedDB 不可用的警告信息

#### Scenario: IndexedDB 可用时正常持久化
- **WHEN** IndexedDB 正常可用
- **THEN** Zustand store 状态正常持久化到 IndexedDB
- **AND** 刷新后数据恢复
