## 1. 数据模型

- [x] 1.1 `src/types/mindmap.ts`: MindMap 新增 `pattern?: string`
- [x] 1.2 `src/stores/mindmapStore.ts`: `addMindmap` 接受 `pattern` 参数（默认 `"auto"`）

## 2. Prompt 层

- [x] 2.1 `src/lib/mindmap-generator.ts`: `buildFullMindmapPrompt(pattern)` 接受参数，追加 pattern 指令
- [x] 2.2 四种 pattern 的 prompt 指令实现（auto 无追加）

## 3. 生成管道

- [x] 3.1 `src/features/chat/ChatPage.tsx`: `doSend` 中传递 `monitoredMindmap.pattern ?? 'auto'` 到 `buildFullMindmapPrompt`
- [x] 3.2 `updateMindmapForConversation` 只改 tree 不改 pattern 字段

## 4. UI

- [x] 4.1 `src/features/chat/NewConversationDialog.tsx`: 新建脑图时增加 pattern 选择下拉
- [x] 4.2 传入 pattern 到 `handleNewConvSubmit` → `addMindmap(title, pattern)`
- [x] 4.3 `src/features/mindmap/MindMapPanel.tsx`: 工具栏显示当前 pattern 标签
- [x] 4.4 `src/features/mindmap/MindMapTree.tsx`: pattern 从 store 读取，不再硬编码 `'auto'`

## 5. 测试

- [x] 5.1 `buildFullMindmapPrompt` 单元测试：验证每种 pattern 注入正确指令（+4 tests）
- [x] 5.2 store 类型已更新，addMindmap 默认 pattern='auto'
- [x] 5.3 `npm test` (73 passed) + `npm run lint` (0 errors)
