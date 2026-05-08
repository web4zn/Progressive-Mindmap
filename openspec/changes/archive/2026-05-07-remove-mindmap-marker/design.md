## CONTEXT

当前 `buildFullMindmapPrompt` 有两条路径：JSON mode（`response_format: json_object`）和 marker mode（`<!--MINDMAP-->` HTML 注释）。`supportsJsonMode` 通过 `detectJsonMode()` 自动检测，匹配 OpenAI/DeepSeek/SiliconFlow/OpenRouter/Google 等主流端点。非 JSON mode 的 endpoint（如自定义 Ollama 实例）走 marker mode。

## GOALS / NON-GOALS

**Goals:**
- 统一为 JSON mode 单一路径
- 删除 marker mode 相关的死代码：`parseMarkdownToTree`、`buildHybridContext`、`stripSourceAnnotations`
- 简化 `parseJsonToTree`：移除 3 阶段容错，保留直接 `JSON.parse` + 错误处理
- 移除 `sourceConversationIds` / `sourceExcerpts` 字段（从未填充）

**Non-Goals:**
- 不改变 JSON mode 的 prompt 内容（仅删除 `useJsonMode=false` 分支）
- 不移除 `supportsJsonMode` / `detectJsonMode`（保留用于判断是否传 `response_format`）
- 不改变已持久化的数据格式

## DECISIONS

### Decision 1: `buildFullMindmapPrompt` 去掉参数

```typescript
// 改前:
export function buildFullMindmapPrompt(useJsonMode = false): string

// 改后:
export function buildFullMindmapPrompt(): string  // 始终返回 JSON mode prompt
```

调用方 `ChatPage.tsx` L117-119 相应简化。

### Decision 2: ChatPage 移除 marker 解析

`ChatPage.tsx` L167-191 整个 else 分支删除。`doSend` L115 `useJsonMode` 变量可去掉（始终为 true）。

### Decision 3: `parseJsonToTree` 简化

```typescript
// 改前: 3阶段容错 + markdown回退 (L158-206)
// 改后:
export function parseJsonToTree(jsonString: string): MindMapNode[] {
  const parsed = JSON.parse(jsonString) as { nodes?: unknown[] }
  if (!Array.isArray(parsed.nodes)) return []
  return parsed.nodes.map(n => jsonNodeToMindMapNode(n))
}
```

### Decision 4: 删除的文件/函数

| 删除项 | 原因 |
|--------|------|
| `parseMarkdownToTree` | 仅被已移除的回退路径调用 |
| `buildHybridContext` | `doSend` 不使用（用内联构建） |
| `stripSourceAnnotations` | 无上游调用 |
| `sourceConversationIds` / `sourceExcerpts` 字段 | 从未填充 |

## RISKS / TRADE-OFFS

- [非 JSON mode provider 不再能生成脑图] → Mitigation: 主流 provider 全部支持 `response_format: json_object`（OpenAI API 兼容标准）。自定义 Ollama endpoint 若不支持可配置 proxy
