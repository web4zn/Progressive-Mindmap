## Why

当前脑图生成依赖 LLM 自行判断知识的组织方式，节点分类粒度参差不齐——同一话题可能被切成 3 节点或 15 节点，结构不可预测。给 LLM 一个思考框架（pattern）可显著提升生成质量的一致性和可测试性。

## What Changes

- MindMap 类型增加 `pattern` 字段，可选 `"auto"` / `"5w1h"` / `"tech"` / `"pros-cons"`
- 用户创建脑图时选择 pattern，new conversation dialog 中增加选择控件
- `buildFullMindmapPrompt(pattern)` 接受 pattern 参数，向 prompt 注入对应指令
- 脑图面板显示当前 pattern
- 默认值为 `"auto"`（当前行为，无限制），**BREAKING**: 旧脑图数据无 pattern 字段时视为 `"auto"`

## Capabilities

### New Capabilities
- `mindmap-generation-pattern`: 脑图知识组织模式——用户可选 pattern 约束 LLM 生成结构

### Modified Capabilities
- `mindmap-data`: MindMap 类型增加 `pattern` 字段
- `mindmap-generation`: `buildFullMindmapPrompt` 根据 pattern 注入不同的组织指令

## Impact

- `src/types/mindmap.ts` — MindMap 新增 `pattern?: string`
- `src/lib/mindmap-generator.ts` — `buildFullMindmapPrompt(pattern)` 
- `src/stores/mindmapStore.ts` — `addMindmap` 接受 pattern
- `src/features/chat/NewConversationDialog.tsx` — 新增 pattern 选择控件
- `src/features/mindmap/MindMapPanel.tsx` — 显示当前 pattern
- `src/features/chat/ChatPage.tsx` — 传递 pattern 到 `buildFullMindmapPrompt`
