## Context

当前项目已有稳定的 Agent 架构：

- **Web Worker** (`agent.worker.ts`) — 独立线程跑 LLM 调用，不阻塞 UI
- **ReAct 循环** — 最多 5 步：LLM 决定是否调工具 → 主线程执行 → 结果注入 → 继续
- **工具 Round-trip** — Worker `postMessage` 请求主线程执行 `readMindmap` / `generateMindmapOps`
- **两种模式** — ENHANCE（对话生成了新内容，自动更新脑图）、MEDIATE（用户对 Agent 说话，更新脑图 + 流式回答）
- **`useMindmapAgent` hook** — 统一入口，外部只调 `initialize / enhanceMessage / mediateMessage`

以上架构通过 30+ 轮迭代验证，稳定有效。问题出在工程实现层面：335 行单文件、零数据校验、prompt 内联。

## Goals / Non-Goals

**Goals:**
- 提取 `BaseAgent` 抽象类，使 Agent 逻辑可单独测试
- 从 `agent.worker.ts` 提取 `ReActRunner`，解耦消息路由和推理循环
- System prompt 从 hook 移到独立文件
- `applyOperations()` 前加 Zod 校验
- 保持所有现有接口和行为不变

**Non-Goals:**
- 不改 ReAct 循环为多 Agent Pipeline（过度设计）
- 不拆包、不加 monorepo
- 不换 LLM 框架（继续用 Vercel AI SDK）
- 不引入新外部依赖
- 不改变 postMessage 协议
- 不改变 `useMindmapAgent` 对外的三个方法签名

## Decisions

### Decision 1: 保持 ReAct 循环，提取到类

**选择**：`ReActRunner` 类封装循环逻辑，`agent.worker.ts` 只做消息路由。

```typescript
class ReActRunner {
  constructor(private agent: BaseAgent, private tools: ToolSet) {}

  async run(userPrompt: string, options?: ReActOptions): Promise<string> {
    const messages = [{ role: 'user', content: userPrompt }]
    for (let step = 0; step < options?.maxSteps ?? 5; step++) {
      const result = await this.agent.callLLM({ messages, tools: this.tools })
      // ... 处理 toolCalls / toolResults
      if (result.toolResults.length === 0) return result.text ?? ''
    }
  }
}
```

**不拆分 Planner/Writer/Reflector**：当前的 ReAct 循环只有 2-3 步，拆成 3 个独立 Agent 会增加 2 次额外 LLM 调用，且 Planner 看不到 Writer 的执行结果。一张专门化的 system prompt 在单次上下文里做完"计划→执行→回答"更高效。

### Decision 2: Zod 校验放在 applyOperations 前

**选择**：在 `agent-tools.ts` 的 `generateMindmapOps` 处理器中，`applyOperations()` 调用前加 `safeParse`。

```typescript
const OperationsArraySchema = z.array(z.object({
  type: z.enum(['add_child', 'update', 'delete_leaf', 'add_root']),
  parentId: z.string().optional(),
  nodeId: z.string().optional(),
  label: z.string().optional(),
  summary: z.string().optional(),
  // ... 等
})).max(10)

export async function generateMindmapOps(input: { operations: unknown }) {
  const parsed = OperationsArraySchema.safeParse(input.operations)
  if (!parsed.success) {
    return { error: `操作校验失败: ${parsed.error.message}`, success: false }
  }
  const newTree = applyOperations(tree, parsed.data)
  // ...
}
```

LLM 输出不可信，这是数据完整性的最后一道防线。

### Decision 3: BaseAgent 是薄封装

**选择**：`BaseAgent` 只封装 `callLLM()` 和 `callTool()` 两个方法，不定义 `process()` 抽象方法。

当前只有一个 Agent，不需要复杂的多 Agent 继承体系。BaseAgent 提供：
- `this.ctx` — 统一的 AgentContext（model, endpoint, logger）
- `this.callLLM()` — 封装 generateText 调用
- `this.callTool()` — 封装工具 round-trip

未来如果需要加第二个 Agent，直接继承即可。

## File Structure

```
改动前                               改动后

src/                                 src/
├── workers/                          ├── workers/
│   └── agent.worker.ts (335行)        │   └── agent.worker.ts (~120行)  ← 只做消息路由
├── hooks/                             ├── hooks/
│   └── useMindmapAgent.ts (324行)      │   └── useMindmapAgent.ts (~280行) ← 移除内联 prompt
├── lib/                               ├── lib/
│   ├── agent/                         │   ├── agent/
│   │   ├── types.ts                   │   │   ├── types.ts
│   │   └── agent-tools.ts             │   │   ├── agent-tools.ts (+ Zod)
│   └── llm-client.ts                  │   │   ├── system-prompt.ts  ← 新增
│                                       │   │   ├── base-agent.ts    ← 新增
│                                       │   │   └── schema.ts        ← 新增
│                                       │   └── llm-client.ts
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 提取 ReActRunner 引入 bug | 保留原有逻辑 100%，只做提取不改变行为；全部回归测试 |
| Zod 校验误拒绝合法操作 | 用 `safeParse` 不抛异常；校验失败返回 descriptive error，不影响系统 |
| 新增文件增加复杂度 | 3 个新文件，每个 50-150 行，工程化的必要成本 |
