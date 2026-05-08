# Progressive Mindmap — 代码级分析报告

> **方法**: 仅基于 `src/` 代码, 不参考任何文档或 change 描述  
> **日期**: 2026-05-07  
> **代码版本**: `opencode` 分支当前 HEAD

---

## 1. 执行摘要

Progressive Mindmap 是一个纯前端 SPA。用户与 AI 聊天时, 系统在每个请求的 system prompt 中附带脑图生成指令。LLM 在回答问题的同时返回一个完整的树形 JSON, 前端解析后更新 React Flow 画布。用户手动编辑过的节点通过 `editedByUser` 标记保护, 不会被 AI 覆盖。

项目经过多次迭代后, 当前 MVP 架构是经历过取舍的结果。

---

## 2. 数据模型 (types/)

### MindMapNode
```
┌─────────────────────────────────────────┐
│ id: string          (deriveNodeId 哈希) │
│ label: string                           │
│ summary: string                         │
│ content?: string     (markdown 正文)     │
│ contentType?: 'text' | 'markdown'       │
│ children: MindMapNode[]  (递归)         │
│ sourceConversationIds: string[] → 永远[] │
│ sourceExcerpts: Record<string,string> → {} │
│ editedByUser: boolean                   │
└─────────────────────────────────────────┘
```

### MindMap
```
┌─────────────────────────────────────────┐
│ id: string                              │
│ title: string                           │
│ tree: MindMapNode[]                     │
│ monitoredConversationIds: string[]       │
│ collapsedNodeIds?: string[]             │
│ createdAt, updatedAt: number            │
└─────────────────────────────────────────┘
```

### Provider
```
┌─────────────────────────────────────────┐
│ id, name, apiEndpoint, apiKey          │
│ models: Model[]                         │
│ supportsJsonMode: boolean (auto-detect) │
└─────────────────────────────────────────┘
```

### store 层 (Zustand 5 + persist + IndexedDB)

| Store | 持久化 | 版本 | 关键职责 |
|-------|--------|------|---------|
| `providerStore` | IndexedDB | v3 | 提供商 CRUD + OpenRouter 预填 + JSON mode 检测 |
| `conversationStore` | IndexedDB | v2 | 会话 CRUD + 消息管理 + 归档 |
| `mindmapStore` | IndexedDB | v3 | 脑图 CRUD + 树操作 + 会话关联 + 折叠状态 |
| `chatStore` | 无 (内存) | - | 生成状态 + 错误 + AbortController |

---

## 3. 核心流程 (doSend — ChatPage.tsx L76-217)

```
用户点击发送
  │
  ├─ ① 写入 user message + 空 assistant message
  ├─ ② startGeneration()
  │
  ├─ ③ 构建 system prompt:
  │      effectiveSystemPrompt
  │        = conv.systemPrompt (可选)
  │        + buildFullMindmapPrompt(useJsonMode)
  │
  │    useJsonMode = prov.supportsJsonMode
  │      └─ detectJsonMode(apiEndpoint)
  │         → 识别 OpenAI/DeepSeek/SiliconFlow/OpenRouter/Google
  │
  ├─ ④ 如果有被监控的脑图 (monitoredConversationIds 匹配 + tree.length > 0):
  │      systemContent += mindmapTreeToContext(现有树)
  │
  ├─ ⑤ chat(client, { model, messages, useJsonMode })
  │      └─ JSON mode: response_format: json_object
  │      └─ 非 JSON mode: 普通请求
  │
  ├─ ⑥ 解析 LLM 响应:
  │    JSON mode → JSON.parse → { answer, mindmap: { nodes } }
  │    非 JSON mode → 搜索 <!--MINDMAP--> 标记 → 提取 JSON
  │    → parseJsonToTree(jsonStr)
  │       ├─ 3 阶段 JSON 容错 (尾逗号修复/代码块剥离/大括号提取)
  │       ├─ maxDepth=6, children.slice(0,10)
  │       └─ 失败 → markdown 标题解析回退
  │
  └─ ⑦ updateMindmapForConversation(newTree, convId):
       遍历所有 mindmap → 匹配 monitoredConversationIds
       → findEditedNodes(旧树)
       → mergeEditedNodes(新树, 已编辑节点)
       → updateMindmapTree() → IndexedDB 持久化
       → React Flow 重渲染 (dagre LR 布局)
```

---

## 4. 架构决策与取舍

以下决策是经过迭代后保留的, 不是疏忽:

| 决策 | 原因 |
|------|------|
| **生成与聊天耦合在 doSend 中** | 独立生成需要额外 LLM 调用, 延迟倍增 |
| **全量重生成 (非增量)** | LLM 看到完整的树结构比做增量手术更稳定 |
| **注入全树而非部分上下文** | 增量上下文导致分支合并结果不一致, 已弃用 |
| **JSON mode 为主路径** | `response_format: json_object` 消除格式不确定性 |
| **editedByUser 硬覆盖保护** | 以完整旧节点替换 AI 新节点, 而非字段级合并 |
| **非流式生成** | 脑图更新等待完整 JSON 解析后一次性应用, 避免中间态 |

---

## 5. `editedByUser` 保护机制

```
节点 ID 生成规则:
  deriveNodeId(label, parentLabels)
  → 基于 label + 父路径的确定性哈希
  → 相同 label + 相同路径 = 相同 ID

保护流程:
  ① AI 生成新树 (全部节点 editedByUser = false)
  ② findEditedNodes(旧树) → 收集所有 editedByUser=true 的节点
  ③ mergeEditedNodes(新树, 旧编辑节点):
      新树中与旧编辑节点 ID 匹配的 → 完整替换为旧节点
      不匹配的 → 保留 AI 的新版本

触发 editedByUser=true:
  - 用户双击节点编辑属性 (updateNode)
  - 用户右键添加子节点 (addChildNode)
```

---

## 6. 代码残留 (vestigial code)

以下功能在类型或函数中存在, 但没有任何数据流过:

| 残留项 | 位置 | 状态 |
|--------|------|------|
| `sourceConversationIds` / `sourceExcerpts` | `MindMapNode` 类型 | 永远 `[]` / `{}`, UI 显示 `💬0` |
| `stripSourceAnnotations()` | `mindmap-generator.ts` L52-54 | 防御性正则, 没有代码创建 `[源:]` 注解 |
| `buildHybridContext()` | `mindmap-generator.ts` L269-283 | 不被 `doSend` 调用 |
| `parseJsonToTree` 3 阶段容错 | `mindmap-generator.ts` L158-206 | JSON mode 下 `response_format: json_object` 保证合法, 容错链是冗余的 |
| `<!--MINDMAP-->` 解析路径 | `ChatPage.tsx` L167-191 | 接入主流 provider 时从不触发 (都走 JSON mode) |
| `isStreaming` / `streamChat` | `MindMapTree.tsx` props, `llm-client.ts` L41-64 | 脑图生成从不使用流式调用, 实际始终 `false` |

---

## 7. 同生态对比

与同类开源项目对比 (代码层面能确认的优势):

| 能力 | 说明 |
|------|------|
| **聊天即构建** | 用户在正常聊天中知识自动结构化, 无需切换工具 |
| **editedByUser 保护** | 在 survey 的开源项目中未见类似机制 |
| **本地优先 IndexedDB** | 零后端, API key 直发提供商 |
| **多提供商 JSON mode 自动检测** | `detectJsonMode()` 根据 URL 自动启用 |
| **树操作完整** | 添加/编辑/删除/移动/重父子 + 折叠 + 右键菜单 |
| **导出** | PNG 1x/2x/3x + SVG + Markdown |
| **TypeScript strict + 131 测试** | `strict: true` + `noUncheckedIndexedAccess` |

---

## 8. 真实存在的大模型优化点

以下仅列出未在迭代中被否决的方案:

### 8.1 JSON mode 路径简化 (vestigial 清理)

当前 JSON mode 路径: `JSON.parse → parseJsonToTree → 3阶段容错 + markdown 回退`。  
由于 `response_format: json_object` 保证输出为合法 JSON, 容错链不必要。

```typescript
// 当前 (ChatPage.tsx L153-162):
if (useJsonMode) {
  const parsed = JSON.parse(accumulated) as { answer?: string; mindmap?: { nodes?: unknown[] } }
  if (parsed.mindmap?.nodes) {
    const newTree = parseJsonToTree(JSON.stringify({ nodes: parsed.mindmap.nodes }))
    // ...
  }
}

// 可简化为:
if (useJsonMode) {
  const parsed = JSON.parse(accumulated) as { answer?: string; mindmap?: { nodes?: unknown[] } }
  if (parsed.mindmap?.nodes) {
    const newTree = (parsed.mindmap.nodes as unknown[]).map(n =>
      jsonNodeToMindMapNode(n, 0, 6, [])
    )
    // ...
  }
}
```

### 8.2 `sourceConversationIds` 填充

当前 `parsed.mindmap.nodes` 解析后不记录来源。可以在解析时把当前 `conversationId` 注入:

```typescript
// jsonNodeToMindMapNode 返回后:
newTree.forEach(n => {
  deepTraverse(n, node => {
    node.sourceConversationIds = [conversationId]
  })
})
```

`MindMapNodeComponent.tsx` L67 已经有 `💬{sourceCount}` 的 UI, 只是值永远为 0。

### 8.3 树截断阈值可配置化

当前硬编码 `maxNodes=200`, `children.slice(0,10)`, `maxDepth=6`。  
对于使用大上下文窗口模型 (如 Gemini 2M) 的用户, 可以暴露这些参数。

### 8.4 prompt 迭代空间

当前中文 prompt (`buildFullMindmapPrompt`) 已足够工作, 但 LLM 生成质量可通过以下方式提高:

- **JSON Schema 约束**: 用 `response_format: { type: "json_schema", json_schema: {...} }` 替代 `json_object`, 让 LLM 输出严格符合 MindMapNode 结构的 JSON
- **few-shot 示例**: prompt 中可以加入 1-2 个完整的脑图 JSON 示例, 指导 LLM 的输出粒度
- **节点粒度指令**: 当前只限 `children.slice(0,10)`, 可以在 prompt 中明确"每个父节点不超过 8 个子节点"

### 8.5 生成质量可观测性

当前只有 `console.log` 打点。可以扩展:
- 记录每次生成的 token 消耗
- 记录 `parseStage` (1/2/3/4/fallback)
- 记录树变化 diff (新增/修改/删除节点数)

---

## 9. 未在代码中执行的 Roadmap 项

| Roadmap 项 | 代码状态 |
|-----------|---------|
| 流式脑图预览 | 有 `isStreaming` prop 和骨架屏 UI, 但 `doSend` 用非流式 `chat()` |
| Undo/Redo | 无 |
| 键盘快捷键 | 仅 `deleteKeyCode="Delete"` |
| 多布局类型 | 固定 dagre LR |
| 协作 | 无 |
| 节点内富内容 | 已有 `content/contentType` 字段 + react-markdown 渲染, UI 已支持 |

---

## 10. 项目结构

```
src/
├── features/
│   ├── chat/          ChatPage (编排), MessageList/Input/Bubble, ModelSelector, NewConversationDialog
│   ├── mindmap/       MindMapPanel, MindMapTree (ReactFlow), MindMapNodeComponent (自定义节点),
│   │                  MindMapEdgeComponent, MindMapEditModal, MindMapContextMenu
│   ├── conversation/  ConversationSidebar, ConversationSettingsDialog
│   └── provider/      ProviderSettingsPage
├── stores/
│   ├── providerStore.ts    providers[], selectedId, add/update/remove
│   ├── conversationStore.ts conversations[], activeId, addMsg/updateMsg/archive
│   ├── mindmapStore.ts     mindmaps[], tree CRUD, node ops, monitoredConv
│   └── chatStore.ts        isGenerating, error, abortController
├── lib/
│   ├── mindmap-generator.ts   prompt模板, parseJsonToTree, mergeEditedNodes, mindmapTreeToContext
│   ├── llm-client.ts          createClient, chat (非流式), streamChat (流式), streamChatWithRetry
│   ├── mindmap-layout.ts      treeToFlow, applyLayout (dagre LR)
│   ├── indexeddb-storage-adapter.ts  IndexedDB persist adapter
│   ├── db.ts                   IndexedDB schema (v5)
│   ├── export-mindmap.ts      PNG/SVG 导出 (html-to-image)
│   ├── export.ts              Markdown 导出
│   ├── id.ts                  generateId, deriveNodeId
│   └── utils.ts
├── components/
│   ├── ui/              shadcn/ui 组件 (button, dialog, select, input, textarea, tooltip, etc.)
│   └── ErrorBoundary, EmptyState, Avatar
└── types/
    ├── mindmap.ts       MindMapNode, MindMap
    ├── conversation.ts  Conversation
    ├── message.ts       Message
    └── provider.ts      Provider, Model
```
