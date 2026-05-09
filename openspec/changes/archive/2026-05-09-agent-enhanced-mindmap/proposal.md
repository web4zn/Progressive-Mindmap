## Why

当前脑图生成与聊天响应捆绑在单次 LLM 调用中，导致两个问题：
1. **AI 被迫分心** — 同一调用既要回答用户又要输出脑图 JSON，两者质量互相妥协
2. **无工具调用、无记忆、无迭代** — 纯靠单次 prompt，无法搜索、检索记忆、反思质量

需要一个 **Agent 层** 中介/增强对话过程，使聊天更流畅、脑图质量实现质的飞跃。

## What Changes

### 聊天流程重构
- 从 `ChatPage.doSend()` 抽取聊天逻辑到独立 `useConversation` hook
- 聊天使用 `streamChat()` 流式响应（取代当前非流式 `chat()`）
- 聊天 prompt 不再包含脑图生成指令 — AI 专注回答用户问题

### Agent 增强层 (新增)
- 引入 **Vercel AI SDK v6 ToolLoopAgent** 作为 Agent 推理引擎
- Agent 在 **Web Worker** 中运行，不阻塞 UI 线程
- 双模式：
  - **增强模式（默认）**：用户直接与 AI 对话，Agent 在后台分析对话并更新脑图
  - **中介模式**：用户直接对 Agent 说话，Agent 全权负责规划、工具调用、回答和脑图生成
- Agent 工具集：`readMindmap` / `generateMindmapOps` / `searchMemory` / `webSearch`

### 脑图生成分离
- 脑图生成从聊天响应中解耦，由 Agent 独立调用 LLM 完成
- 全量替换 → **增量操作** (`add_child`, `update`, `delete_leaf`, `add_root`, `noop`)
- 保留 `editedByUser` 保护机制，增强为操作级拦截

### Web Worker 架构
- `agent.worker.ts` 运行 ToolLoopAgent，通过 `postMessage` 与主线程通信
- 工具实际执行在主线程（访问 IndexedDB、Zustand stores）
- 类型化的通信协议 (`src/lib/agent/types.ts`)

### Agent 活动可视化
- 新增 `AgentActivityPanel` 显示 Agent 当前状态（思考中/读取脑图/生成中）
- 中介模式下展示完整 Agent 推理链

## Capabilities

### New Capabilities
- `agent-orchestration`: Agent 推理引擎，管理双模式（增强/中介）的调度和工具调用
- `agent-memory`: 跨会话的记忆系统，支持语义检索和事实提取
- `mindmap-incremental`: 增量脑图操作引擎，支持原子级增删改而非全量替换
- `agent-worker`: Web Worker 通信基础设施，主从线程协议

### Modified Capabilities

None — this change does not modify existing spec-level behavior. Existing chat, mindmap display, and provider configuration remain unchanged.

## Impact

- **架构**: 新增 Web Worker 线程、Agent 层、增量操作引擎
- **性能**: 聊天改为流式，用户体验更快；脑图生成移至后台，不阻塞 UI
- **外部依赖**: 新增 `ai` (Vercel AI SDK v6)、`@ai-sdk/openai`、`zod`
- **文件结构**: 新增 6 文件 (~630 行)，修改 3 文件，删除 0 文件
- **现有功能**: 完全向后兼容，增强模式可选，中介模式为新入口
