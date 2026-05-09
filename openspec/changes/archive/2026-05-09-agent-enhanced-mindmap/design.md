## Context

Progressive Mindmap 当前架构中，脑图生成与聊天响应捆绑在一次 LLM 调用中：

```
用户消息 → [system prompt = 用户提示 + 脑图指令 + 脑图树上下文] → LLM → { answer, mindmap } → 解析 → 更新
```

问题：AI 需要同时做两件事（回答 + 生成脑图），两者质量互相妥协。没有流式响应、没有工具调用、没有迭代反思。

本设计引入 Agent 层，将聊天和脑图生成解耦，并分两个阶段实施。

## Goals / Non-Goals

**Goals:**
- 聊天改为流式响应（`streamChat()`），用户体验更快
- 脑图生成从聊天响应中分离，由 Agent 在后台独立完成
- 引入 Vercel AI SDK v6 ToolLoopAgent 作为 Agent 推理引擎
- Agent 在 Web Worker 中运行，不阻塞 UI
- 双模式：增强模式（Agent 后台增强）和中介模式（Agent 全权负责）
- 全量脑图替换 → 增量操作（add_child / update / delete_leaf）
- 保留 `editedByUser` 节点保护机制

**Non-Goals:**
- 阶段 1 不实现向量数据库 / 语义记忆（阶段 2）
- 阶段 1 不实现网络搜索工具（阶段 3）
- 不修改现有 IndexedDB schema
- 不修改现有 mindmap 渲染管线（FlowShell / dagre layout）
- 不引入后端服务

## Decisions

### Decision 1: Vercel AI SDK v6 ToolLoopAgent 作为 Agent 引擎

**选择**: Vercel AI SDK v6 的 `ToolLoopAgent`

**理由**:
- TypeScript 原生，与项目现有 `openai` SDK 同生态
- `ToolLoopAgent` 提供开箱即用的 ReAct 循环（思考 → 工具调用 → 观察 → 继续）
- 浏览器中直接运行，无需后端代理
- `tool()` 函数式 API 天然适配 round-trip 架构（Worker 决定 → 主线程执行）
- 可自定义 `Agent` 接口，未来可替换

**拒绝的方案**:
- LangGraph.js: Node.js 为主，浏览器兼容性差
- OpenAI Assistants API: 需要后端代理，与管理式 API 耦合
- 自建 ReAct 循环: 灵活但重复造轮子，缺少 step 管理、工具注册等基础设施

### Decision 2: Web Worker 作为 Agent 运行环境

**选择**: 专用 Web Worker (`new Worker(...)`, `type: 'module'`)

**理由**:
- Agent 多步推理可能耗时数秒，Worker 避免阻塞 UI
- Vite 原生支持 Web Worker，无需额外配置
- 通过 `postMessage` 与主线程通信，天然隔离

**拒绝的方案**:
- 主线程直接运行: 推理时 UI 冻结
- Service Worker: 生命周期复杂，不适合短暂任务
- Shared Worker: 不需要多 tab 共享 Agent 状态

### Decision 3: Round-Trip 工具执行模式

**选择**: Worker 决定调用什么工具 → 发送 `TOOL_RESULT_NEEDED` → 主线程执行 → 返回结果

**理由**:
- Worker 无法直接访问 DOM、Zustand stores、IndexedDB
- 主线程持有所有状态，是工具执行的唯一合法位置
- 类型化的通信协议 (`MainToWorkerMessage` / `WorkerToMainMessage`) 保证类型安全

### Decision 4: 增量操作取代全量替换

**选择**: Agent 输出 `MindmapOperation[]` 而非完整树

**理由**:
- 增量操作更精确、token 消耗更少（只传递操作而非整棵树）
- 与 `editedByUser` 保护机制天然契合（操作级拦截）
- 可为每个操作记录来源，支持未来撤销/重做

**拒绝的方案**:
- 继续全量替换 + `mergeEditedNodes()`: 低效，大树的 token 消耗线性增长

### Decision 5: 分阶段实施

**选择**: 3 个增量阶段，不一次完成所有目标

**理由**:
- 阶段 1 (增强模式 MVP) 2-3 天可交付 → 快速获得价值
- 阶段 2 (增量操作 + 记忆) 2-3 天 → 核心质量提升
- 阶段 3 (中介模式 + 网络增强) 3-5 天 → 完整 Agent 体验

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| **ToolLoopAgent 不支持自定义 baseURL** (DeepSeek/Ollama) | Vercel AI SDK 的 `openai()` 构造函数接受 `baseURL` 参数，兼容兼容性已验证 |
| **Worker 占用内存** (持续运行) | 页面卸载时 `terminate()`，不常驻 |
| **Agent 正在工作时用户发送新消息** | 跳过当前 Agent，等新消息完成后重新触发 |
| **浏览器不支持 Worker** | `typeof Worker === 'undefined'` 时降级为无 Agent 模式，聊天仍正常工作 |
| **ToolLoopAgent step 数量过多** | `stopWhen: stepCountIs(10)` 限制最大步数 |
| **Worker 中 JSON 序列化性能** | 仅传递必要数据（最近 6 条消息 + 树结构字符串），避免大数据传输 |

## Migration Plan

阶段 1 实施步骤：

1. 新增依赖 `ai`, `@ai-sdk/openai`, `zod`
2. 创建 `src/lib/agent/types.ts` — 通信协议
3. 创建 `src/workers/agent.worker.ts` — Agent Worker
4. 创建 `src/lib/agent/agent-tools.ts` — 工具处理函数
5. 创建 `src/hooks/useConversation.ts` — 抽取聊天逻辑，使用 streamChat
6. 创建 `src/hooks/useMindmapAgent.ts` — Agent Worker 管理
7. 创建 `src/features/chat/AgentActivityPanel.tsx` — Agent 状态 UI
8. 修改 `ChatPage.tsx` — 接入新 hooks，简化
9. 修改 `chatStore.ts` — 增加 Agent 状态
10. 测试验证

回滚策略：移除新增文件，恢复 ChatPage.tsx 和 chatStore.ts 到原始版本。

## Open Questions

- Agent 生成脑图时，是否需要在 MindMapPanel 上展示"生成中"的占位效果？
- 中介模式下，Agent 的思考过程默认展开还是折叠？
- 用户能否在 Agent 工作时取消当前脑图生成？
