## Context

Phase 1/2 完成了增强模式（Agent 后台运行）。中介模式让 Agent 全权负责对话：读脑图 → 更新 → 生成回答。用户看到 Agent 的最终输出，不知道 Agent 内部用了什么工具。

## Goals / Non-Goals

**Goals:**
- 模式切换 UI："增强" ↔ "Agent"，一键切换
- 中介模式下，用户消息不调 Chat API，直接发给 Worker
- Worker 内置工具调用（readMindmap + generateMindmapOps），工具完成后再回答
- Worker 用 `streamText` 流式输出最终回答到主线程
- Agent 活动面板不显示在中介模式（Agent 自己就是对话者）

**Non-Goals:**
- 不暴露 Agent 内部工具调用过程给用户
- 不显示 Agent 的"思考"文本
- 不处理多轮对话记忆（阶段 2 已处理）

## Decisions

### 决策 1: 中介模式消息类型

`MEDIATE_MESSAGE` — 主线程 → Worker，包含用户消息 + 最近对话。

Worker 返回：`STREAM_TOKEN`（逐字）→ `STREAM_DONE`（完成）。

不重用 `ENHANCE_MESSAGE`，因为语义不同：增强是"AI 答完了，你补脑图"，中介是"你来回答 + 补脑图"。

### 决策 2: Worker 用 streamText 输出

在 ReAct 循环中，工具调用完成后，最后一步用 `streamText`（而不是 `generateText`）输出最终回答。`streamText` 的 `onChunk` 回调将每个 token 发回主线程。

### 决策 3: 模式切换即时生效

模式保存在 `chatStore.agentMode`。切换时不清除历史，用户可在同一会话中随时切换。增强模式的历史消息对中介模式不可见（中介有自己的消息管理）。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 中介模式响应慢（工具 + LLM） | Agent 活动面板显示"正在处理"，不等待 |
| 用户在中介模式中想打断 | abortController 共享，stopGeneration 中止 Worker 的 streamText |
