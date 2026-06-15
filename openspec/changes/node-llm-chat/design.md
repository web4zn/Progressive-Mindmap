# Node-Level LLM Conversation — Design

> Detailed technical design for the per-node conversation feature.
> Covers scope filtering, data flow, and key architectural decisions.

## Table of Contents

1. [Data Model](#1-data-model)
2. [Agent Scope Filtering (核心设计)](#2-agent-scope-filtering-核心设计)
3. [Agent Call Chain — Scope Propagation](#3-agent-call-chain--scope-propagation)
4. [Navigation & Dialog Flows](#4-navigation--dialog-flows)
5. [Store Operations](#5-store-operations)
6. [Key Edge Cases](#6-key-edge-cases)
7. [File Change Plan](#7-file-change-plan)

---

## 1. Data Model

### MindMapNode (v3)

```ts
// src/types/mindmap.ts
export interface MindMapNode {
  id: string
  label: string
  summary: string
  content?: string
  contentType?: 'text' | 'html'
  children: MindMapNode[]
  editedByUser: boolean

  // v2 fields (unchanged)
  color?: string
  position?: { x: number; y: number }
  icon?: string
  tags?: string[]
  updatedAt?: number

  // v3 — NEW
  linkedConversationId?: string
}
```

**Schema version**: `MINDMAP_SCHEMA_VERSION` → `3`

**Migration (v2 → v3)**: Pure declaration. No data rewrite needed — existing nodes simply have `linkedConversationId: undefined`.

### 关系规则

```
全局关系： MindMap.monitoredConversationIds  ←→  Conversation[]
节点关系： MindMapNode.linkedConversationId  ←→  Conversation (one-to-one)
```

- 一段对话可以既是全局关联又是节点关联（同时出现在两个字段中）
- 已知的冲突场景：如果一个对话已经是某些节点的 `linkedConversationId`，又被设置为另一个节点的 `linkedConversationId` → ⚠️ 目前不允许这种操作。用户只能通过 UI 触发创建新对话或复用已有对话。`linkNodeConversation` 用于覆盖已有关联。

---

## 2. Agent Scope Filtering (核心设计)

### 2.1 原则

**不可见即不可修改。** 节点会话触发的 Agent 只能看到 scope 节点及其子树。查询工具返回的数据已被过滤；Agent 无法引用 scope 外的任何节点 ID。

### 2.2 架构概览

```
Main Thread                            Worker
──────────                             ──────
useMindmapAgent                         agent.worker.ts
  │                                       │
  │  setScope(nodeId)                      │
  │  mindmapTreeToFlatContext(scopeTree)   │
  │  postMessage(ENHANCE, scopeTree) ───→ │  ReActRunner.run()
  │                                       │    → tool call
  │  ← TOOL_RESULT_NEEDED ────────────── │
  │                                       │
  │  agentToolHandlers (with scope)       │
  │    → reads mm.tree                    │
  │    → filters by scopeNodeId           │
  │    → returns scoped result            │
  │                                       │
  │  postMessage(TOOL_RESULT) ──────────→ │  continues ReAct loop
```

### 2.3 Scope 状态的承载

`agent-tools.ts` 增加模块级可变状态：

```ts
// agent-tools.ts — 新增
let _activeScopeNodeId: string | null = null

export function setAgentScope(scopeNodeId: string | null): void {
  _activeScopeNodeId = scopeNodeId
}

export function getAgentScope(): string | null {
  return _activeScopeNodeId
}
```

Scope 状态的生命周期：
- `setAgentScope(nodeId)` — 在 `enhanceMessage`/`mediateMessage` 之前调用
- `setAgentScope(null)` — 在 Agent 完成后、全局会话触发 Agent 前调用
- 因为同一时间只有一个活跃 Worker，模块级状态是线程安全的

### 2.4 工具查询的 scope 过滤

**核心原则：不向 LLM 暴露 scope 的存在。** 越界查询时返回自然结果——和"这个节点本来就不存在"100% 一致。不能包含"不在范围内""不可见"等任何 hint。

所有查询工具共用同一套 scope 提取逻辑：

```ts
// 获取当前可查询的树（scope 子树或全量树）
function getQueryTree(tree: MindMapNode[]): MindMapNode[] {
  if (!_activeScopeNodeId) return tree
  const scopeNode = findNodeById(tree, _activeScopeNodeId)
  return scopeNode ? [scopeNode] : tree  // 回退到全量（scope 节点已删除）
}
```

各工具的 scope 行为：

#### getNodeDetail(nodeId)

```ts
// 变化：查询树替换为 scope 子树
const queryTree = getQueryTree(mm.tree)
const node = findNodeById(queryTree, nodeId)
if (!node) return { error: `未找到节点: ${nodeId}` }
// ... 正常返回
```

越界节点返回 `"未找到节点: ${nodeId}"`——LLM 只会认为该 ID 不存在。

#### getChildren(nodeId)

同上——在 scope 子树内查找。越界返回空 `children`。

#### getParent(nodeId)

```ts
// scope 模式下——不特殊处理，让自然行为接管
const queryTree = getQueryTree(mm.tree)
const node = findNodeById(queryTree, nodeId)
if (!node) return { error: `未找到节点: ${nodeId}` }

const parentResult = findParentNode(queryTree, nodeId)
return {
  parent: parentResult
    ? { id: parentResult.node.id, label: parentResult.node.label }
    : null,
  // 注意：scope 根节点自然就是 parent: null，不额外注释
}
```

**scope 根节点查询 parent → 返回 `{ parent: null }`**，和真正的根节点完全一致。不返回任何 note/注释。

#### getSiblings(nodeId)

scope 跟节点没有兄弟 → 返回空列表。scope 内非根节点正常返回。

#### getAncestors(nodeId)

```ts
const path = getAncestorPath(queryTree, nodeId)
// scope 模式下路径自然在 scope 根节点截断——因为 scope 根节点
// 的父节点不在 queryTree 中，getAncestorPath 找不到
```

#### getSubtree(nodeId, depth)

在 scope 子树内查找。越界返回 `{ error: "未找到节点: ${nodeId}" }`。

#### searchNodes(query)

```ts
const matches = _activeScopeNodeId
  ? searchTree(queryTree, query.trim(), [])
  : searchTree(mm.tree, query.trim(), [])
```

越界关键词搜索命中率为 0——自然表现为"没有匹配的节点"。

### 2.5 写入操作（generateMindmapOps）的 scope 处理

```ts
// agent-tools.ts generateMindmapOps handler — scope check

if (_activeScopeNodeId) {
  // scope 模式下：拒绝 add_root
  const hasAddRoot = ops.some((op) => op.type === 'add_root')
  if (hasAddRoot) {
    return {
      success: false,
      error: 'scope 模式下不允许 add_root 操作',
      nodeCount: countNodes(targetMindmap.tree),
      operations: [],
    }
  }

  // 检查所有操作的目标节点是否在 scope 内
  for (const op of ops) {
    const targetId = 'parentId' in op ? op.parentId 
      : 'nodeId' in op ? op.nodeId 
      : null
    if (targetId && !isNodeInScope(targetMindmap.tree, _activeScopeNodeId, targetId)) {
      console.warn(LOG, `跳过越界操作: ${op.type} ${targetId} 不在 scope 内`)
      // 跳过越界操作，不阻断整个批次
    }
  }
}
```

`isNodeInScope` 实现：

```ts
function isNodeInScope(tree: MindMapNode[], scopeNodeId: string, targetId: string): boolean {
  const scopeNode = findNodeById(tree, scopeNodeId)
  if (!scopeNode) return false
  // 目标节点 = scope 根节点？通常不会（add_child 不会用 scope 根做 parentId），但安全起见检查
  if (targetId === scopeNodeId) return true
  // 在 scope 子树中查找目标节点
  return findNodeById([scopeNode], targetId) !== null
}
```

### 2.6 scope 化 applyOperations

当 `_activeScopeNodeId` 存在时，`applyOperations` 先提取 scope 节点的子树，在该子树内部执行操作，然后写回原树：

```ts
// mindmap-generator.ts — 新增 scope 感知版本
function applyScopedOperations(
  tree: MindMapNode[],
  scopeNodeId: string,
  operations: MindmapOperation[],
): MindMapNode[] {
  // 1. 找到 scope 节点
  // 2. 将 scope 节点及其子树深拷贝
  // 3. 在拷贝的子树中执行 applyOperations
  // 4. 用修改后的子树替换原树中的 scope 节点
}
```

> **为什么需要 scope 化 applyOperations？** 因为 applyOperations 会修改树中节点（update、delete_leaf、reparent），如果直接在完整树上操作，scope 外的节点可能被误改（即使 Agent 看不到它们）。通过将操作限制在 scope 子树内，确保物理上不可能改动 scope 外的内容。

### 2.7 mindmapTreeJson（传给 Worker 的脑图上下文）

`useMindmapAgent.enhanceMessage` / `mediateMessage` 新增 `scopeNodeId` 参数：

```ts
// useMindmapAgent — 变化
const enhanceMessage = useCallback(
  (conversationId: string, scopeNodeId?: string) => {
    // ...
    const treeForAgent = scopeNodeId
      ? extractScopeSubtree(mm.tree, scopeNodeId)  // 新函数：提取 scope 子树
      : mm.tree
    
    const mindmapTreeJson = treeForAgent.length > 0 
      ? mindmapTreeToFlatContext(treeForAgent)
      : ''
    
    const msg: MainToWorkerMessage = {
      type: 'ENHANCE_MESSAGE',
      payload: {
        conversationId,
        // ... 其他字段不变
        mindmapTreeJson,
        // 新增字段，方便排查
        scopeNodeId,
      },
    }
    worker.postMessage(msg)
  },
  [setAgentStatus],
)
```

---

## 3. Agent Call Chain — Scope Propagation

### 3.1 全局会话 → Agent（不变）

```
ChatPage: AI response complete
  → agent.enhanceMessage(convId)             // scopeNodeId = undefined
    → setAgentScope(null)
    → mindmapTreeJson = flatContext(fullTree)
    → Worker: ENHANCE(convId, fullTree)
      → tool handlers: no scope filter
      → applyOperations: no scope
```

### 3.2 节点会话 → Agent（新增路径）

```
ChatPage: AI response complete (in node conversation)
  → agent.enhanceMessage(convId, scopeNodeId)   // ← scopeNodeId = linked node
    → setAgentScope(scopeNodeId)
    → scopeTree = extractScopeSubtree(fullTree, scopeNodeId)
    → mindmapTreeJson = flatContext(scopeTree)
    → Worker: ENHANCE(convId, scopeTree)
      → tool handlers: scope filtering active
      → applyOperations: scoped mode
    → setAgentScope(null)  // cleanup
```

### 3.3 Message Protocol 变更

```ts
// src/lib/agent/types.ts — ENHANCE_MESSAGE payload
type MainToWorkerMessage =
  | {
      type: 'ENHANCE_MESSAGE'
      payload: {
        conversationId: string
        recentMessages: { role: string; content: string }[]
        mindmapTreeJson: string
        pattern: string
        providerConfig: { apiEndpoint: string; apiKey: string }
        model: string
        scopeNodeId?: string        // ← NEW: for logging/debugging
      }
    }
  // MEDIATE_MESSAGE 同上
```

Worker 端不需要对 `scopeNodeId` 做特殊处理——它对 Worker 不可见，因为 `mindmapTreeJson` 已经是 scope 子树。`scopeNodeId` 仅用于日志和诊断。

### 3.4 触发时机

节点会话触发 Agent 增强的时机与全局会话相同——**AI 回答完成后**。在 `ChatPage` 的 `onStreamComplete` 回调中判断：

```ts
// ChatPage.tsx — 变化
const { sendMessage, stopGeneration, isGenerating } = useConversation({
  onStreamComplete: (convId, _msgId) => {
    // 判断该对话是否有对应的 scope 节点
    const scopeNodeId = findScopeNodeForConversation(convId)
    if (scopeNodeId) {
      agent.enhanceMessage(convId, scopeNodeId)  // 节点会话 → scope agent
    } else {
      agent.enhanceMessage(convId)                 // 全局会话 → 普通 agent
    }
  },
})
```

`findScopeNodeForConversation` 实现：

```ts
// 遍历脑图节点，查找 linkedConversationId === convId
function findScopeNodeForConversation(convId: string): string | null {
  const mindmaps = useMindmapStore.getState().mindmaps
  for (const mm of mindmaps) {
    const found = findNodeByLinkedConv(mm.tree, convId)
    if (found) return found.id
  }
  return null
}
```

---

## 4. Navigation & Dialog Flows

### 4.1 "Ask LLM" 点击流程

```
MindMapTree.handleAskLlm(nodeId)
  │
  ├─ node.linkedConversationId 存在?
  │   └─ YES → setActiveConversationId(linkedConversationId)
  │             + centerOnNode(nodeId)
  │
  └─ NO → 1. conversationStore.addConversation({ ...继承配置 })
          2. 构建 systemPrompt:
             = (activeConv?.systemPrompt ?? '') +
               '\n\n' +
               '当前讨论聚焦于以下知识点：\n' +
               `- 节点：${node.label}\n` +
               `- 摘要：${node.summary}\n` +
               `- 内容：${node.content}\n\n` +
               '请基于以上话题展开，AI的补充操作将限制在该节点的子树范围内。'
          3. conversationStore.updateConversation(newConvId, { systemPrompt })
          4. mindmapStore.addMonitoredConversation(mmId, newConvId)
          5. mindmapStore.linkNodeConversation(mmId, nodeId, newConvId)
          6. setActiveConversationId(newConvId)
          7. centerOnNode(nodeId)
```

### 4.2 💬 图标点击流程

```
FlowNode.onBubbleClick(nodeId)
  │
  ├─ node.linkedConversationId 存在?
  │   └─ NO → 不做任何事情（不该出现）
  │
  ├─ isFullScreen?
  │   └─ YES → 仅 tooltip "退出全屏以进入对话"，不跳转
  │
  └─ NO → setActiveConversationId(linkedConversationId)
           + centerOnNode(nodeId)  // 跳转后高亮节点
```

`centerOnNode(nodeId)` 通过现有 `FlowShell` 的 `fitView` + `setCenter` 能力实现：
- 已有 `useMindmapLayout` hook 和 FlowShell 的 `centerOnNode` 方法（在 Stage A1 中已有 `onNodeDoubleClick` 中的 `fitView` 行为）
- 从 `MindMapPanel` 传递 `focusNodeId` → `MindMapTree` → `FlowShell`

### 4.3 节点删除级联对话框

```
MindMapTree.deleteNode(nodeId)
  │
  ├─ node.linkedConversationId 存在?
  │   └─ NO → 直接删除（现有行为）
  │
  └─ YES → 弹出删除确认对话框:
           ┌────────────────────────────────────────┐
           │ 删除节点                                 │
           │                                         │
           │ 该节点关联了一个对话「{对话标题}」，       │
           │ 是否同时删除对话？                        │
           │                                         │
           │ ☐ 同时删除关联的对话                     │
           │                                         │
           │       [取消]  [确认删除]                  │
           └────────────────────────────────────────┘
           │
           ├─ 取消 → 不做任何操作
           ├─ 确认 + ☐ 未勾选 → deleteNode + unlinkNodeConversation
           └─ 确认 + ☐ 已勾选 → deleteNode + conversationStore.removeConversation
```

对话框的实现方案：
- **不新增全局 Dialog 组件**。复用 `MindMapTree` 中已有的 `deleteConfirm` 状态（当前是内联确认态），但扩展为带选项的 Dialog
- 使用 `@/components/ui/dialog` 中的 `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`
- 复选框状态用 `useState(false)` 局部管理

---

## 5. Store Operations

### 5.1 mindmapStore 新增

```ts
interface MindMapState {
  // ...现有方法

  // v3 — 新增
  linkNodeConversation: (mindmapId: string, nodeId: string, conversationId: string) => void
  unlinkNodeConversation: (mindmapId: string, nodeId: string) => void
}
```

`linkNodeConversation` 实现：

```ts
linkNodeConversation: (mindmapId, nodeId, conversationId) => {
  set((state) => ({
    mindmaps: state.mindmaps.map((m) => {
      if (m.id !== mindmapId) return m
      return {
        ...m,
        tree: findAndUpdateNode(m.tree, nodeId, (node) => ({
          ...node,
          linkedConversationId: conversationId,
        })),
        updatedAt: Date.now(),
      }
    }),
  }))
},
```

`unlinkNodeConversation` 实现：

```ts
unlinkNodeConversation: (mindmapId, nodeId) => {
  set((state) => ({
    mindmaps: state.mindmaps.map((m) => {
      if (m.id !== mindmapId) return m
      return {
        ...m,
        tree: findAndUpdateNode(m.tree, nodeId, (node) => {
          const { linkedConversationId: _drop, ...rest } = node
          void _drop
          return { ...rest, editedByUser: true }
        }),
        updatedAt: Date.now(),
      }
    }),
  }))
},
```

### 5.2 conversationStore 新增

`conversationStore` **不需要**新增方法——现有 `addConversation`、`removeConversation`、`updateConversation`、`setActiveConversationId` 已满足需求。

---

## 6. Key Edge Cases

### 6.1 scope 根节点的 parent 查询

Agent 查询 `getParent(scopeNodeId)` → 返回 `null` + `note: "此节点已在当前操作范围的顶部"`。

**风险**：Agent 可能认为该节点是根节点而尝试 `add_root`。但由于 scope 模式下 `add_root` 被拒绝，这不会生效。Agent 在拿到拒绝信息后会调整行为。

### 6.2 scope 模式下 sibling 查询

scope 根节点调用 `getSiblings` → 返回空列表（scope 边界外没有兄弟）。

### 6.3 两个节点关联同一对话

假设节点 A 有 `linkedConversationId = "conv1"`。用户对节点 B 右键 → Ask LLM。

当前设计：如果 conv1 同时属于节点 B 的 scope... 实际上不会——用户只会对还没关联的节点点 Ask LLM。如果节点已有 `linkedConversationId`，Ask LLM 会直接跳转不会创建新对话。

但如果用户在节点 B 上点了 Ask LLM，而节点 B 已有 `linkedConversationId = "conv1"`（与节点 A 相同）→ 这不可能发生，因为 `linkNodeConversation` 每次写一个新值，不会复用到另一个节点的值上。

### 6.4 scope 节点被删除后正在运行中的 Agent

如果用户在 Agent 运行期间删除了 scope 节点：
- `findNodeById(tree, scopeNodeId)` 返回 null
- 所有后续查询工具返回错误 "节点不存在"
- Agent 的下一次 tool call 拿到错误后会自动推理并结束
- 不影响界面稳定性

### 6.5 💬 图标在流式生成过程中的出现节点

AI 生成新增子节点时，初始状态 `linkedConversationId` 为 undefined。只有用户通过 Ask LLM 主动关联才会出现 💬。

### 6.6 节点 A 关联对话 → 对话中 AI 生成了节点 B → 节点 B 被用户手动关联

这是两个独立操作——节点 B 的 `linkedConversationId` 独立于节点 A。用户可以手动对节点 B 再次 Ask LLM。

---

## 7. File Change Plan

### 7.1 修改清单

| 文件 | 变更类型 | 变更内容 |
|------|---------|---------|
| `src/types/mindmap.ts` | 修改 | `MindMapNode` +`linkedConversationId`, `MINDMAP_SCHEMA_VERSION` → 3 |
| `src/types/index.ts` (或迁移文件) | 修改 | v2→v3 migration |
| `src/stores/mindmapStore.ts` | 修改 | +`linkNodeConversation`, +`unlinkNodeConversation` |
| `src/lib/agent/types.ts` | 修改 | `ENHANCE_MESSAGE` payload +`scopeNodeId` |
| `src/lib/agent/agent-tools.ts` | 修改 | +scope 状态管理、所有查询工具的 scope 过滤、`applyOperations` scope 模式 |
| `src/lib/agent/agent-tools.def.ts` | 修改 | 无 schema 变化（scope 不暴露给 Agent schema，在 handler 层自动注入） |
| `src/lib/agent/system-prompt.ts` | 修改 | scope 模式下追加作用域说明 |
| `src/lib/mindmap-generator.ts` | 修改 | +`extractScopeSubtree`, +`applyScopedOperations`, +`findNodeByLinkedConv` |
| `src/hooks/useMindmapAgent.ts` | 修改 | `enhanceMessage`/`mediateMessage` +`scopeNodeId` 参数 |
| `src/hooks/useConversation.ts` | 不改 | `onStreamComplete` 回调已有 convId——scope 查找在 ChatPage 层 |
| `src/features/chat/ChatPage.tsx` | 修改 | `onStreamComplete` 中判断 scope、调用 `enhanceMessage(convId, scopeNodeId)` |
| `src/features/mindmap/MindMapContextMenu.tsx` | 修改 | +`askLlm` 菜单项、+`onAskLlm` 回调 |
| `src/features/mindmap/MindMapTree.tsx` | 修改 | +`onAskLlm` 路由、删除级联对话框 |
| `src/features/mindmap/MindMapPanel.tsx` | 修改 | +`handleAskLlm` 逻辑（创建对话/跳转） |
| `src/components/flow-shell/FlowNode.tsx` | 修改 | +💬 图标、点击跳转 |

### 7.2 新增辅助函数（无新增文件）

```ts
// 在 mindmap-generator.ts 中：
- extractScopeSubtree(tree, scopeNodeId): MindMapNode[]
- applyScopedOperations(tree, scopeNodeId, ops): MindMapNode[]
- findNodeByLinkedConv(tree, convId): MindMapNode | null

// 在 agent-tools.ts 中：
- setAgentScope(scopeNodeId | null): void
- getAgentScope(): string | null
- getScopeSubtree(tree, scopeNodeId): MindMapNode[] | null
- isNodeInScope(tree, scopeNodeId, targetId): boolean
```

### 7.3 不修改的文件

- `src/types/conversation.ts` — Conversation 模型不变
- `src/types/message.ts` — Message 模型不变
- `src/stores/conversationStore.ts` — 现有操作已满足
- `src/lib/agent/ReActRunner.ts` — 不需要改（核心逻辑不变，scope 在外部注入）
- `src/lib/agent/schema.ts` — Zod schema 不变
- `src/lib/agent/agent-status-guard.ts` — 不变
- `src/lib/agent/base-agent.ts` — 不变
- `src/workers/agent.worker.ts` — 不需要改（Worker 只做 ReAct 循环，scope 不改变它的任何逻辑）
- `src/features/mindmap/MindMapDrawer.tsx` — 不变
- `src/features/mindmap/MindMapOutline.tsx` — 不变
- `src/features/conversation/ConversationSidebar.tsx` — 不变
- `src/components/flow-shell/FlowShell.tsx` — 不变
