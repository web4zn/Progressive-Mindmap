# Node-Level LLM Conversation

> Adds per-node LLM conversations alongside the existing global conversation pool.
> Right-click a node → "Ask LLM" → chat with the LLM to generate / supplement
> that node's subtree. The node gets a persistent 💬 indicator and a direct link
> to its conversation.

## Why

### 现状

当前整个脑图共享 `monitoredConversationIds` 作为对话素材池。Agent 从这些对话中读取消息，然后在**整棵脑图上**自由操作（add_child / update / delete_leaf）。

这种方式对"初始生成"和"跨节点发散"很有用——Agent 自己决定对话内容应该放到哪个分支——但对于"针对某个节点做深入扩展"的场景有两个限制：

1. **没有聚焦范围**——用户想针对节点 A 展开讨论，Agent 可能顺便改了节点 B 和 C。在全局模式下这是合理的，但在用户只想聚焦时变成了多余行为。
2. **没有归属感**——扩展出来的子树和对话没有视觉关联。用户回头看脑图时，不知道"这个分支是从哪段对话生成的"。

### 目标

让用户可以**以节点为单位**进行 LLM 对话：

- 右键节点 → 以该节点为上下文开始对话
- LLM 回答后只扩展该节点的子树（作用域限制）
- 节点 ↔ 对话有明确的视觉关联（💬 图标）
- 随时可以从节点重新进入对话

同时保留全局对话机制——两种模式各自解决不同场景，互补而非替代。

## What Changes

### 1. 数据模型变更

```
MindMapNode (v2 → v3):
  + linkedConversationId?: string
```

`MindMap` 的 `monitoredConversationIds` **保持不变**。两种关联关系共存：

```
全局关系： MindMap ──monitoredConversationIds──▶ Conversation[]
节点关系： Node ──── linkedConversationId ─────▶ Conversation
```

同一段对话可以同时出现在 `monitoredConversationIds`（全局）和某个节点的 `linkedConversationId`（节点级）——这不算冲突，而是"这段对话既作为全局素材源，又有明确的归属节点"。

Schema 迁移（`MINDMAP_SCHEMA_VERSION` → 3）：
- `MindMapNode` 增加 `linkedConversationId?: string` 可选字段，默认 `undefined`
- 纯声明式迁移，无实际数据改写
- **不做向前兼容**（MVP 阶段，schema 迭代期间旧数据直接用 migration 升级即可）

### 2. Store 层变更

`mindmapStore` 新增操作：

```ts
linkNodeConversation(mindmapId: string, nodeId: string, conversationId: string): void
unlinkNodeConversation(mindmapId: string, nodeId: string): void
```

- `linkNodeConversation` — 在 node 上设置 `linkedConversationId`。如果已有值，覆盖。
- `unlinkNodeConversation` — 清除 node 的 `linkedConversationId`，不删除 Conversation 本身。

### 3. 右键菜单变更

`MindMapContextMenu` **只新增一项"Ask LLM"**。"进入会话"功能由节点 💬 图标独立承载。

菜单项位置：放在"编辑此节点"之后、"添加子节点"之前。

```ts
MENU_ORDER = [
  'edit',
  'askLlm',       // ← 新增
  'addChild',
  'center',
  'drillDown',
  'duplicate',
  'resetPosition',
  'moveUp',
  'moveDown',
  'undo',
  'redo',
  'delete',
] as const
```

内部使用 `onAskLlm` 回调，`MindMapPanel` 层判断：
- 节点无 `linkedConversationId` → 创建新对话并跳转
- 节点已有 `linkedConversationId` → 跳转到已有对话

### 4. 节点视觉变更

`FlowNode.tsx` 新增 💬 气泡图标：

- **位置**：`absolute bottom-1 right-1`
- **默认态**：半透明（`opacity-50`），半透明背景色，不遮挡节点内容
- **Hover 态**：清晰（`opacity-100`），光标变为 pointer
- **渲染条件**：只在 `linkedConversationId` 存在时渲染
- **点击行为**：
  - 聊天面板可见 → 切换 `activeConversationId`
  - 聊天面板隐藏（全屏模式）→ 不跳转，tooltip 提示"退出全屏以进入对话"
- **跳转后**：脑图自动居中高亮到该节点
- 先按此方案实现，视觉上不好看再调整

### 5. 对话创建流程

"Ask LLM" 触发的对话创建：

1. **新建对话**：`conversationStore.addConversation()` 创建
2. **配置继承**：Provider/Model 继承当前 `activeConversation` 的配置（如果无活跃对话则用默认 provider 的第一个模型）
3. **System Prompt 合并**：
   ```
   节点会话的 systemPrompt = 全局对话的 systemPrompt（用户自定义）
                             + 换行分隔
                             + 节点上下文（自动生成，包含 label/summary/content）
   ```
   例如全局设了"你是一个资深架构师"，节点是"Python异步编程"：
   ```
   你是一个资深架构师。

   当前讨论聚焦于以下知识点：
   - 节点：Python 异步编程
   - 摘要：async/await 的原理与最佳实践
   - 内容：[节点 HTML 全文]
   请基于以上话题展开，AI 的补充操作将限制在该节点的子树范围内。
   ```
4. **自动关联**：新对话加入 `monitoredConversationIds`，同时调用 `linkNodeConversation(mindmapId, nodeId, convId)` 建立节点关联
5. **自动跳转**：导航到新对话
6. **注意**：节点会话**不继承**图谱 pattern 的知识组织规则（5W1H/技术/优缺点分析是全局图谱的结构化工具，不适用于节点级扩展对话）

### 6. Agent 作用域限制（核心设计变更）

**原则：不可见即不可修改。不向 LLM 暴露 scope 的存在。**

Agent 不应该感知到"scope"这个概念。如果它查询 scope 外的节点，返回的结果**外观上与"这个节点不存在"完全一致**——不包含"不在范围内""不可见"等任何 hint。

#### 6.1 查询限制

节点会话触发的 Agent 查询时，后台数据从 `mm.tree` 替换为 scope 子树（`extractScopeSubtree(mm.tree, scopeNodeId)`）。所有工具 handler 在 scope 子树上执行，无需 Agent 端配合：

| 工具 | scope 模式行为 | 越界返回 |
|------|---------------|---------|
| `getNodeDetail(nodeId)` | 在 scope 子树中查找 | `{ error: "未找到节点: {nodeId}" }` |
| `getChildren(nodeId)` | 在 scope 子树中查找 | `{ children: [] }` |
| `getParent(nodeId)` | 在 scope 子树中查找；scope 根节点自然没有 parent | `{ parent: null }`（和真正的根节点一致） |
| `getSiblings(nodeId)` | 在 scope 子树中查找；scope 根节点自然没有兄弟 | `{ siblings: [] }` |
| `getAncestors(nodeId)` | 路径截断到 scope 根节点（因为 scope 外的祖先不在查询树中，`getAncestorPath` 自然找不到） | `{ path: [...] }`（从 scope 根开始） |
| `getSubtree(nodeId, depth?)` | 在 scope 子树中查找 | `{ error: "未找到节点: {nodeId}" }` |
| `searchNodes(query)` | 只在 scope 子树内搜索 | `{ matches: [] }` |

**不特殊处理 scope 根节点**——`getParent` 返回 `null`（和真正的根节点一样）、`getSiblings` 返回空列表。LMM 从数据上无法区分"它是根节点"和"它只是 scope 边界"。

#### 6.2 写入限制（防御性）

虽然查询限制已经阻止了越界操作（Agent 不知道 scope 外节点的 ID），`applyOperations` 仍然保留一层防御：

- `add_root` 在 scope 模式下直接拒绝（返回 `{ success: false, error: "不允许添加根节点" }`，不提及 scope）
- 如果操作中的 nodeId 在 scope 子树中找不到，跳过该操作并 warn（代码层日志，不返回给 LLM）

#### 6.3 Prompt 不包含 scope 说明

节点会话的 system prompt 中**不**追加"你的操作范围被限制"之类的说明。如果 prompt 提示了"范围"概念，LLM 可能推断"范围之外有东西"。保持纯净——让它认为它看到的就是全部。

### 7. 对话消息上下文

节点会话触发 Agent 时，只传入**该会话自身的消息**作为上下文，不混入全局 `monitoredConversationIds` 下的其他会话消息。

### 8. 并发安全设计

全局会话和节点会话**共用左侧的会话列表**。同一时间只能存在一次对话和一次 Agent 操作，通过以下机制保证：

- 切换对话时自动中断当前 Agent 操作（已有 `stopGeneration` 机制）
- 两次 Agent 操作天然串行——后一次等前一次完成才触发
- 不需要额外的悲观锁

### 9. 节点删除级联

删除已关联 `linkedConversationId` 的节点时，弹出确认对话框：

> "该节点关联了一个对话，是否同时删除对话？"

选项：
- **仅删除节点**（默认）→ 删除节点，`unlinkNodeConversation`，对话保留为孤儿
- **同时删除对话** → 删除节点 + `removeConversation(linkedConversationId)`

### 10. 节点移动/复制时的 `linkedConversationId` 策略

| 操作 | `linkedConversationId` 行为 |
|------|---------------------------|
| 节点在同图谱内移动（move up/down） | **保留** |
| 节点在同图谱内拖拽换父（reparent） | **保留** |
| 节点被复制（duplicate） | **不复制**（新节点是独立实体，没有关联会话） |

## Capabilities

### New Capabilities
- `node-llm-conversation` — 节点级 LLM 对话创建、关联、导航
- `node-llm-scope-agent` — Agent 在节点子树范围内执行增量操作（通过查询限制实现）

### Modified Capabilities
- `mindmap-context-menu` — 新增 "Ask LLM" 菜单项
- `mindmap-node-render` — 节点右下角 💬 气泡图标 + 点击跳转
- `mindmap-data` — `MindMapNode` 新增 `linkedConversationId` 字段（v3 schema）
- `mindmap-store` — 新增 `linkNodeConversation` / `unlinkNodeConversation` 操作
- `agent-mindmap-pipeline` — 查询工具支持 `scopeNodeId` 过滤，system prompt 追加作用域说明

## Impact

### 修改文件（预估）

```
src/types/mindmap.ts                     — MindMapNode.linkedConversationId + schema v3
src/stores/mindmapStore.ts               — linkNodeConversation / unlinkNodeConversation
src/features/mindmap/MindMapContextMenu.tsx  — 新增 Ask LLM 菜单项
src/features/mindmap/MindMapTree.tsx      — onAskLlm 回调 + 导航 + 节点删除确认
src/features/mindmap/MindMapPanel.tsx     — onAskLlm 逻辑（创建对话/跳转）
src/components/flow-shell/FlowNode.tsx    — 💬 气泡图标 + 点击跳转
src/lib/agent/types.ts                   — ENHANCE/MEDIATE 消息增加 scopeNodeId（仅日志）
src/lib/agent/agent-tools.ts             — scope 状态管理 + 查询工具 scope 过滤 + 写入防御
src/lib/mindmap-generator.ts             — extractScopeSubtree / applyScopedOperations
src/lib/migration/                       — mindmap v2 → v3 migration
```

**不需要修改**（即 scope 逻辑对它们透明）：
- `agent.worker.ts` — Worker 端不需感知 scope（treeJson 已提前 scoped）
- `ReActRunner.ts` — 核心 ReAct 逻辑不变
- `system-prompt.ts` — 不追加 scope 说明，Agent 不应意识到 scope
- `agent-tools.def.ts` — 工具 schema 不变（scope 在 handler 层自动注入）
- `conversationStore.ts` — 现有操作已满足
- `ChatPage.tsx` — 仅 `onStreamComplete` 中新增 scope 查找，不改变核心逻辑

### 不修改

- `MindMapDrawer` 不变（全局关联会话的展示不改）
- `ChatPage` 不变（对话体验不改，只新增从外部切换的入口，已有的 `setActiveConversationId` 即可）
- `MindMapHeader` 不变
- `MindMapOutline` 不变
- `MindMapFilter` / `MindMapSearch` 不变
- `Electron` 层不变

### 不涉及

- 不新增 npm 依赖
- 不新增 IndexedDB object store
- 不改 Conversation 数据模型
- 不改 `MindMapDrawer` 和 `MindMapOutline`

## Out of Scope

- 节点 ↔ 多对话关系（一个节点只关联一个对话）
- 对话合并/拆分功能
- 节点会话的历史记录导出
- Agent 同时处理多个 scope 节点的写入（自然不触发，因为同一时间只有一个活跃对话）
- 向前兼容（MVP 阶段）

## Risks

### 1. Agent 查询越界 → 自然"未找到"

如果 Agent 不小心生成了一个 scope 外（或不存在）的 nodeId，查询工具返回 `{ error: "未找到节点: {nodeId}" }`，和查询一个真实不存在的节点完全一致。LLM 不会意识到"有 scope 限制"，只会认为这个 ID 无效。这不会导致 LLM 错误行为——它已经习惯了偶尔拿到无效 ID（`generateMindmapOps` 的 `applyOperations` 也会跳过无效 ID）。

### 2. scope 根节点伪装为根节点

`getParent` 在 scope 根节点返回 `{ parent: null }`，和真正的树根节点行为一致。Agent 可能因此认为该节点是整棵脑图的根节点而尝试 `add_root`，但 scope 模式下 `add_root` 会被拒绝。Agent 拿到拒绝后自然调整行为，不会产生副作用。

### 3. 节点删除确认对话框的 UI

当前的删除确认对话框（MindMapContextMenu 里的确认态）是一个简单的内联确认。如果要加"是否同时删除对话"的选项，需要升级为 `Dialog` 组件或者内联复选框。后者更轻量，但需要看交互是否清晰。

### 4. 全屏模式下的跳转受限

💬 图标在全屏模式下不跳转，只给 tooltip。用户需要退出全屏后才能进入对话。这是一个有意识的设计——全屏模式是沉浸式浏览，中途切换对话会破坏体验。如果用户反馈不好用，可以改为"退出全屏 + 自动跳转"。

### 5. scope 查询的边界性能

`getSubtree(nodeId, depth=5)` 配合 scope 过滤需要在树中先定位 scope 根节点，再定位目标节点，再做过滤。最多嵌套两层 O(n) 遍历，对于几百个节点的脑图可以接受（当前已有 `findAndUpdateNode` 走同样复杂度的遍历）。

### 6. 节点删除确认的遗忘路径

用户可能在 `MindMapTree` 中通过键盘（Delete 键）或右键菜单删除节点。如果节点有关联对话，两种入口都需要弹出确认对话框。

## Verification

- `npm run build` — typecheck clean
- `npm test` — 全量测试通过，包含：
  - `linkNodeConversation` / `unlinkNodeConversation` store 操作
  - 节点级查询工具 scope 过滤（正常查询 / 越界查询 / 边界情况）
  - `applyOperations` scope 轻量级断言
  - 💬 图标渲染条件（有/无 `linkedConversationId`）
  - 右键菜单条件显示
  - 节点删除级联确认对话框
  - `getParent` 在 scope 根节点的返回行为
- `npm run lint` clean
- 手动冒烟：
  - 右键无关联节点 → Ask LLM → 创建对话并跳转 → 聊天 → Agent 只改该节点子树
  - 节点出现 💬 → 点击跳回对话 → 继续聊天
  - 已有 `linkedConversationId` 的节点 → 右键显示 Ask LLM → 点击跳转到已有对话
  - 删除已关联节点 → 弹出确认框 → 仅删除节点 / 同时删除对话 两条路径
  - 全屏模式下点击 💬 → 不跳转，显示 tooltip
  - 节点 move / reparent → `linkedConversationId` 保留
  - 节点 duplicate → `linkedConversationId` 不复制
  - 全局对话正常使用（不受影响，后退兼容）
