## MODIFIED Requirements

### Requirement: Provider persistence
系统 SHALL 将供应商配置持久化到 IndexedDB，通过 Zustand persist + `createIndexedDBStorage()` 实现。

#### Scenario: API key stored in IndexedDB
- **WHEN** 用户保存提供商配置
- **THEN** API 密钥写入 IndexedDB `zustand-persist` store
