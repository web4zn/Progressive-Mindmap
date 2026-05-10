## Why

当前 ModelSelector（模型选择）和 Agent mode 切换（增强 / Agent）都放在导航栏中，看起来像全局控制项，但模型（providerId/modelId）实际上已经是 per-conversation 存储在 Conversation 类型中。而 Agent mode（enhance/mediate）却是全局状态，存在 chatStore 里，切换会话时不会跟随。

这导致两个问题：
1. **用户心智模型错位**——"选模型"和"切模式"是跟当前对话绑定的操作，用户期望它们出现在输入区域，而不是导航栏
2. **模式不跟随会话**——从对话 A（Agent 模式）切到对话 B 时，模式依然是 Agent，这可能不是用户想要的

此变更将控制项移至输入面板，与 shadcn/ui 的 InputGroup 风格对齐，让每个对话拥有完整的独立配置。

## What Changes

- **BREAKING - 导航栏精简**：从导航栏移除 ModelSelector 和 Agent mode toggle，放入输入面板
- **新的会话输入面板**：重构 MessageInput，整合 ModelSelector + Agent mode toggle + textarea + send 按钮，横排双行布局
- **Agent mode per-conversation**：`agentMode` 从全局 chatStore 迁移到 Conversation 类型
- **Agent activity 面板归入输入面板**：AgentActivityPanel 不再独立于输入区域之外，而是附属于输入面板
- **Worker 模型同步修复**：ENHANCE_MESSAGE 时传入最新 providerConfig + model（当前只有 MEDIATE_MESSAGE 做了重建）

## Capabilities

### New Capabilities

- `chat-input-panel`: 集成 ModelSelector、Agent mode toggle 和 textarea 的统一输入面板组件

### Modified Capabilities

- `agent-orchestration`: Agent mode 从全局改为 per-conversation，模式切换的行为跟随会话切换

## Impact

- **UI 组件**：MessageInput → 重构为 ChatInputPanel，ModelSelector 和 mode toggle 嵌入其中
- **类型系统**：`Conversation` 增加 `agentMode?: 'enhance' | 'mediate'`
- **Store**：`chatStore` 移除 `agentMode` 相关字段，`conversationStore` 处理 per-conversation 模式
- **Worker通信**：`ENHANCE_MESSAGE` 增加 `providerConfig` 和 `model` 字段（修复跨会话 model 过期）
