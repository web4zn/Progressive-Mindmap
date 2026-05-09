## Why

当前只有增强模式：用户对聊天 AI 说话，Agent 在后台补脑图。用户无法直接对 Agent 下达意图明确的指令（如"帮我系统对比 Python 和 Rust 并加入脑图"）。中介模式让 Agent 全权负责对话，能主动读脑图、搜索、分析，再生成回答。

## What Changes

### 中介模式入口
- `MessageInput` 旁新增模式切换按钮："增强" ↔ "Agent"
- 中介模式：用户消息发送给 Worker，Agent 全权处理

### Agent 流式响应
- Worker 收到 `MEDIATE_MESSAGE` 后走 ReAct 循环
- 工具调用完成后，用 `streamText` 流式输出最终回答
- 主线程接收 `STREAM_TOKEN` 逐字显示

### 通信协议扩展
- 新增 `MEDIATE_MESSAGE` — 主线程 → Worker
- 新增 `STREAM_TOKEN` — Worker → 主线程（逐字）
- 新增 `STREAM_DONE` — Worker → 主线程（完成）

### ChatStore 扩展
- 新增 `agentMode: 'enhance' | 'mediate'`

## Capabilities

### New Capabilities

None — mediate mode was already specified in `agent-orchestration` spec (dual mode requirement). This change implements what was deferred.

### Modified Capabilities

- `agent-orchestration`: Implement `Scenario: User switches to mediate mode` and `Scenario: User sends message in mediate mode` from the existing spec.

## Impact

- **UI**: 模式切换按钮 + 中介模式 placeholder
- **Worker**: 新增 MEDIATE_MESSAGE handler + streamText
- **主线程**: 新增 mediateMessage + stream token 处理
- **通信协议**: +3 消息类型
- **现有功能**: 增强模式不受影响
