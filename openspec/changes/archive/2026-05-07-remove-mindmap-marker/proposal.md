## Why

JSON mode (`response_format: json_object`) 已成为主流路径，`<!--MINDMAP-->` 标记模式、markdown 解析回退、`buildHybridContext`、`stripSourceAnnotations` 成为死代码。`sourceConversationIds`/`sourceExcerpts` 类型字段无数据流。一并清理。

## What Changes

- `buildFullMindmapPrompt(useJsonMode)` — 移除 `useJsonMode=false` 分支，统一为 JSON 格式
- `ChatPage.tsx` L167-191 — 移除 `<!--MINDMAP-->` 标记搜索解析路径
- `parseJsonToTree` — 移除 3 阶段 JSON 容错 + markdown 回退；`response_format: json_object` 保证合法 JSON，只需直接 `JSON.parse` + 错误处理
- `parseMarkdownToTree` — 整体删除（仅被已移除的回退路径调用）
- `buildHybridContext` — 删除（`ChatPage` 不用它）
- `stripSourceAnnotations` — 删除
- `sourceConversationIds` / `sourceExcerpts` 字段 — 从 `MindMapNode` 类型和所有初始化代码中移除
- `MindMapNodeComponent` L67-69 — 移除 `💬{sourceCount}` 显示
- 更新相关测试

## Capabilities

### Modified Capabilities
- `mindmap-generation`: 移除标记模式，统一为 JSON mode；移除 markdown 解析回退
- `mindmap-data`: 移除 `sourceConversationIds` 和 `sourceExcerpts` 字段

## Impact

- `src/lib/mindmap-generator.ts` — 大幅简化
- `src/features/chat/ChatPage.tsx` — 移除 else 分支
- `src/types/mindmap.ts` — 移除 2 个字段
- `src/features/mindmap/MindMapNodeComponent.tsx` — 移除 sourceCount UI
- 测试文件更新
