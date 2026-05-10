## Context

当前 `ModelSelector` 和 Agent mode toggle（✨增强 / 🤖Agent）在 `ChatPage.tsx` 的导航栏区域（line 268-324）渲染，`agentMode` 存在全局 `chatStore` 中。

shadcn/ui 首页的 AI 输入风格采用 `InputGroup` 组件族：控制项（model selector、mode selector）作为 addon 附着在输入框周围，形成统一的输入面板。

Agent Worker 生命周期分析结论：切换 mode 不需要重启 Worker，Worker 一次创建即可处理两种 mode 消息。但 `ENHANCE_MESSAGE` 不会更新 `languageModel`，跨会话时可能用错模型。

## Goals / Non-Goals

**Goals:**
- ModelSelector 从导航栏移至输入面板
- Agent mode toggle 从导航栏移至输入面板
- `agentMode` 从全局 chatStore 迁移到 per-conversation（Conversation 类型）
- 新输入面板采用 shadcn 风格：横排双行（控制行 + 输入行）
- AgentActivityPanel 归入输入面板下方
- `ENHANCE_MESSAGE` 也传入 `providerConfig` + `model`，修复跨会话 model 过期

**Non-Goals:**
- 不改动 ModelSelector 的交互逻辑（dropdown 选 model 的交互保持不变）
- 不改动 Agent mode 切换的业务逻辑（只是位置和数据范围变了）
- 不改动 Worker 内部的 ReAct 循环逻辑
- 不改动导航栏其他元素（mindmap toggle、settings button 保留）

## Decisions

### 决策 1: 横排双行布局

借鉴 shadcn InputGroup 风格：

```
┌─────────────────────────────────────────────────────┐
│ [Model: DeepSeek/V3 ▼]    [✨增强 | 🤖Agent]        │  ← 控制行
├─────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐ [Send]   │  ← 输入行
│ │ 输入消息开始对话...                     │          │
│ └───────────────────────────────────────┘          │
│ ┌─ Agent 活动指示器 ───────────────────────────────┐│
│ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

控制行：ModelSelector（左侧）+ Agent mode toggle（右侧），flex row，中间自然分隔。
输入行：textarea + send button，与当前 MessageInput 类似但集成到同一容器。
Agent 活动指示器：在输入面板底部，仅在增强模式且非 idle 时显示。

**替代方案考虑**：
- 单行紧凑（控制项嵌入输入框两侧）：会限制 ModelSelector 的宽度，不适合模型名称较长的情况
- 控制项垂直堆叠：占用垂直空间太多

### 决策 2: agentMode 存入 Conversation 类型

```typescript
// Conversation 类型增加字段
interface Conversation {
  // ... 现有字段
  agentMode?: 'enhance' | 'mediate'  // 新增，默认 'enhance'
}
```

**理由**：
- 模型已经是 per-conversation（providerId, modelId），模式跟随一致
- 切换会话时模式自动跟随
- 新建对话时默认 enhance，与当前行为一致
- 不需要额外的映射表

**替代方案**：
- 在 chatStore 中维护 `Map<conversationId, agentMode>`：增加了复杂度，数据不同步（会话删除时需要清理）

### 决策 3: Worker 消息增强

`ENHANCE_MESSAGE` payload 增加 `providerConfig` 和 `model` 字段，与 `MEDIATE_MESSAGE` 对齐：

```typescript
// ENHANCE_MESSAGE payload 增加
payload: {
  // ... 现有字段
  providerConfig: { apiEndpoint: string; apiKey: string }  // 新增
  model: string  // 新增
}
```

Worker 收到 `ENHANCE_MESSAGE` 时重建 `languageModel`（与 `MEDIATE_MESSAGE` 一致）。

### 决策 4: 新建对话默认 agentMode

新建对话时 `agentMode` 默认 `'enhance'`（保持当前全局默认行为）。用户可在输入面板中切换。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 输入面板高度增加（双行） | 控制行高度仅 32px，整体增加不大。且输入框 auto-resize 到多行时不额外占用空间 |
| 控制行在窄屏上换行 | 使用 `flex-wrap` + `gap` 在小屏上自然换行，或直接隐藏 model 全称用缩写 |
| agentActivityPanel 位置变化 | 从全局底部移到输入面板底部，语义上更合理——它是"输入的附属信息" |
| ModelSelector 交互不变但 DOM 位置变了 | 纯 DOM 移动，组件自身逻辑和 store 引用不变 |
