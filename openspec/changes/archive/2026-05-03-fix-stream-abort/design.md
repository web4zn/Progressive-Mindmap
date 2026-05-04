## Context

当前实现通过 `AbortController` 中断 LLM 流式请求，但存在两个问题：
- OpenAI SDK v4+ 在 abort 时将原生的 `AbortError` 包装为 `APIConnectionError`，导致 `err.name === 'AbortError'` 检查失败
- 检查失败后走通用错误路径，将 assistant 消息标记为 `error`，与规范要求"保留部分内容"不符

## Goals / Non-Goals

**Goals:**
- 用户点击停止后，已生成的部分内容保留显示，消息状态为 `complete`
- 正确检测 OpenAI SDK 的 abort 错误

**Non-Goals:**
- 不改变流式输出或重试逻辑
- 不修改 chatStore 的 API

## Decisions

### D1: Abort 检测方式

**选择**: 在 `doSend` 中通过 `AbortController.signal.aborted` 状态检测

**理由**: 不依赖错误类型名称（不同 SDK 版本封装方式不同），直接检查信号状态更可靠。

**备选**:
- 检查 `err instanceof OpenAI.APIError` 且 message 包含 "abort": 依赖 SDK 内部实现细节，跨版本不稳定

### D2: Abort 后消息状态

**选择**: 将 assistant 消息 `status` 设为 `complete`，保留已有 `content`

**理由**: 匹配规范要求 "保留已生成的部分内容"。

## Risks / Trade-offs

- [Abort 延迟] 点击停止后，信号需要传播到 fetch，可能有短暂延迟 → 按钮立即显示为禁用/加载状态
- [部分内容完整性] Markdown 渲染可能在 token 中间被截断 → 低优先级，保留已渲染的 partial Markdown
