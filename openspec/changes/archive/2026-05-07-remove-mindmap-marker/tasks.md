## 1. mindmap-generator.ts 简化

- [x] 1.1 `buildFullMindmapPrompt`: 移除 `useJsonMode` 参数，只保留 JSON mode prompt
- [x] 1.2 删除 `parseMarkdownToTree` 函数
- [x] 1.3 删除 `buildHybridContext` 函数
- [x] 1.4 删除 `stripSourceAnnotations` 函数
- [x] 1.5 `parseJsonToTree`: 移除 3 阶段容错，改为直接 `JSON.parse` + 错误处理
- [x] 1.6 `jsonNodeToMindMapNode`: 移除 `stripSourceAnnotations` 调用，直接用 `raw.label`

## 2. ChatPage.tsx 简化

- [x] 2.1 `buildFullMindmapPrompt()` 不再传参
- [x] 2.2 `doSend` L153-192: 移除 if/else 分支 + `<!--MINDAP-->` 标记解析，统一为 JSON 解析路径
- [x] 2.3 `useJsonMode` 保留用于 `chat()` 的 `response_format` 控制

## 3. 类型清理

- [x] 3.1 `src/types/mindmap.ts`: 移除 `sourceConversationIds` 和 `sourceExcerpts` 字段
- [x] 3.2 `src/lib/mindmap-generator.ts`: 所有初始化中去掉这两个字段
- [x] 3.3 `src/stores/mindmapStore.ts`: `addChildNode` 中去掉这两个字段
- [x] 3.4 `src/features/mindmap/MindMapNodeComponent.tsx` L67-69: 移除 `sourceCount` 显示

## 4. mindmap-layout.ts / types.ts 清理

- [x] 4.1 `src/features/mindmap/types.ts`: `MindMapNodeData` 移除 `sourceCount`
- [x] 4.2 `src/lib/mindmap-layout.ts`: `treeToFlow` 移除 `sourceCount` 赋值
- [x] 4.3 搜全项目确认无残留引用

## 5. 测试

- [x] 5.1 更新 4 个测试文件移除 marker mode / markdown 解析 / source tracking 相关用例
- [x] 5.2 `npm test` 全部通过 (67 tests)
- [x] 5.3 `npm run lint` 通过 (0 errors)
