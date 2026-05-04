## 1. 类型定义

- [x] 1.1 `src/types/mindmap.ts` 新增 `CorpusEntry` 类型（字段：id / messageId / selectedText? / range? / note? / enabled / addedAt）
- [x] 1.2 `MindMap` 类型新增 `corpus: CorpusEntry[]` 和 `monitoredConversationIds: string[]` 字段
- [x] 1.3 `src/types/mindmap.ts` 删除 `MaterialItem` 类型
- [x] 1.4 `src/types/conversation.ts` 删除 `mindmapId` 和 `autoSync` 字段
- [x] 1.5 `src/types/index.ts` 更新导出

## 2. 删除 materialStore

- [x] 2.1 删除 `src/stores/materialStore.ts` 文件
- [x] 2.2 查找所有 `useMaterialStore` / `materialStore` 引用，移除或替换
- [x] 2.3 删除 `MindMapPanel.tsx` 中对 `useMaterialStore` 的引用和物料池 UI 代码

## 3. 状态管理：语料库 CRUD

- [x] 3.1 `mindmapStore` 新增 `addCorpusEntry(mindmapId, entry)` 方法
- [x] 3.2 `mindmapStore` 新增 `removeCorpusEntry(mindmapId, entryId)` 方法
- [x] 3.3 `mindmapStore` 新增 `toggleCorpusEntry(mindmapId, entryId, enabled)` 方法
- [x] 3.4 `mindmapStore` 新增 `updateCorpusEntryNote(mindmapId, entryId, note)` 方法
- [x] 3.5 `mindmapStore` 新增 `clearCorpus(mindmapId)` 方法
- [x] 3.6 `mindmapStore` 新增 `addMonitoredConversation(mindmapId, conversationId)` 方法
- [x] 3.7 `mindmapStore` 新增 `removeMonitoredConversation(mindmapId, conversationId)` 方法
- [x] 3.8 `mindmapStore` 新增 `addBatchCorpusEntries(mindmapId, entries)` 方法（批量添加，用于「整对话加入」）
- [x] 3.9 单元测试：`mindmapStore` 语料库和监听操作

## 4. 生成逻辑适配

- [x] 4.1 `mindmap-generator.ts` 新增 `collectCorpusContent(corpus, conversations)` 函数：遍历启用的 CorpusEntry，通过 messageId 查找 Message，按 selectedText/range 规则收集内容
- [x] 4.2 `MindMapPanel.tsx` 生成入口改为仅从 `activeMindmap.corpus` 读取；corpus 为空时提示用户
- [x] 4.3 `ChatPage.tsx` 删除 autoSyncTimerRef 及相关自动同步逻辑
- [x] 4.4 `ChatPage.tsx` 新增监听触发逻辑：AI 回复完成后检查 monitoredConversationIds → 自动创建 CorpusEntry → 触发生成（debounce 5s）
- [x] 4.5 更新相关单元测试

## 5. 消息加入语料库 UI

- [x] 5.1 AI 回答消息旁新增「加入语料库」按钮（图标按钮，hover 显示）
- [x] 5.2 选中文本后右键菜单新增「加入语料库」选项，计算并存储 `range`
- [x] 5.3 无活跃图谱时点击加入提示「请先打开或创建图谱」
- [x] 5.4 `NewConversationDialog` 简化：删除图谱关联和自动同步选项

## 6. 语料库 UI

- [x] 6.1 `MindMapPanel.tsx` 新增「语料库」区域，显示当前图谱的语料列表，按来源对话分组折叠
- [x] 6.2 语料列表项显示：内容摘要、启用开关、备注图标、删除按钮
- [x] 6.3 启用/禁用开关：点击切换 `toggleCorpusEntry`
- [x] 6.4 备注功能：点击备注图标打开输入框
- [x] 6.5 删除确认提示
- [x] 6.6 空状态提示
- [x] 6.7 「将当前对话加入语料库」按钮：遍历当前对话的所有 AI 回复，批量创建 CorpusEntry
- [x] 6.8 语料来源已删除时显示「来源已删除」标记

## 7. 对话监听 UI

- [x] 7.1 图谱设置弹窗新增「监听对话」区域，显示所有对话的多选列表
- [x] 7.2 勾选/取消勾选对话 → 调用 `addMonitoredConversation` / `removeMonitoredConversation`

## 8. 验证

- [x] 8.1 端到端：AI 回答 → 点击加入语料库 → 生成图谱 → 验证内容正确
- [x] 8.2 选中文本加入语料库 → 生成 → 验证仅使用选中文本
- [x] 8.3 监听对话：新 AI 回答 → 验证自动加入语料库并触发生成
- [x] 8.4 启用/禁用语料条目后生成，验证 disabled 条目不参与
- [x] 8.5 删除图谱后验证语料数据一同删除
- [x] 8.6 删除 materialStore 后所有现有功能不受影响
