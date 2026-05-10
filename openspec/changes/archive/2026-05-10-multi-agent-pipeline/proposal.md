## Why

当前 Agent 系统的骨架是对的（Web Worker + ReAct 循环 + 工具系统），但存在三个工程问题：

1. **代码耦合**：`agent.worker.ts` 335 行，消息路由、ReAct 循环、工具注册、状态报告全部胶合在一个文件中，无法单独测试任何一部分
2. **缺少数据校验**：LLM 输出的 operations 直接 `applyOperations()`，没有 Zod schema 验证。格式错误（缺字段、类型不对、ID 用 "1"）会直接污染脑图数据
3. **System prompt 硬编码**：176-198 行的 prompt 字符串嵌在 `useMindmapAgent.ts` hook 中，无法测试、无法切换、无法复用

不改变架构（不改 ReAct 循环、不改 Worker、不改两种模式），只做工程解耦 + 数据安全。

## What Changes

- 新增 `BaseAgent` 类，封装 LLM 调用和工具交互
- 从 `agent.worker.ts` 提取 `ReActRunner` 类，解耦消息路由和 ReAct 循环
- System prompt 从 `useMindmapAgent.ts` 移到独立文件 `src/lib/agent/system-prompt.ts`
- `applyOperations()` 前加 **Zod schema 校验**，拒绝坏数据
- `AgentStatus` 状态类型不变，ENHANCE_MESSAGE / MEDIATE_MESSAGE 两种模式不变
- 不改 Worker、不改 useMindmapAgent 接口、不改 agent-tools.ts 工具处理器

## Capabilities

### New Capabilities
- `agent-core`: BaseAgent 基类 + ReActRunner 循环提取，Agent 核心逻辑可测试化
- `agent-schema`: Zod schema 校验层，在 operations 应用前做结构验证

### Modified Capabilities
- 无

## Impact

- **新增文件**：`src/lib/agent/system-prompt.ts`、`src/lib/agent/base-agent.ts`、`src/lib/agent/schema.ts`
- **修改文件**：`src/workers/agent.worker.ts`（提取 ReAct 循环到类）、`src/hooks/useMindmapAgent.ts`（移除内联 prompt）、`src/lib/agent/agent-tools.ts`（加 Zod 校验）
- **无外部依赖变更**
- **删除文件**：无
