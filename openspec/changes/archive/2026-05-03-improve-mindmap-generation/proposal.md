## Why

当前脑图生成存在三个核心痛点：(1) 生成过程无反馈，用户陷入 30-90 秒的盲等；(2) 输入不可控——整段对话一股脑喂给 LLM，无关内容稀释有用信息，垃圾进垃圾出；(3) 生成质量不稳定，prompt 缺乏范例和结构化约束。此外，节点无法溯源对话来源、不可手动编辑，用户对 AI 生成内容只能被动接受，无法修正或验证。这些短板让脑图处于"能看但不中用"的阶段。

## What Changes

- **内容选择机制**：允许用户从对话中选择特定消息或文本作为脑图生成输入，替代全量对话输入。新增「待处理物料池」，支持勾选、拖拽添加、批量选中。
- **生成进度与实时预览**：将流式 chunk 实时解析为不完整树并渲染，替代当前的骨架屏等待。支持显示生成进度（已完成节点数、当前深度）和 reasoning 模型的思考内容。
- **生成质量优化**：引入 few-shot 范例、结构化输出约束（JSON mode/function calling）、渐进式深化（先概览后展开），以及生成后质量校验（重复检测、空节点检测）。
- **节点溯源**：填充 `sourceConversationIds` 字段，存储原始对话片段摘录，让用户可验证每个节点的知识来源。
- **节点手动编辑**：支持双击编辑节点 label/summary，右键菜单增删移节点，编辑后清除溯源标记。
- **跨对话脑图聚合**：将 `Conversation.mindmapId` (1:1) 扩展为 `mindmapIds: string[]` (1:N)，支持一条对话贡献多张脑图。

## Capabilities

### New Capabilities
- `mindmap-content-selection`: 对话内容选择性输入脑图——消息级选中、文本级选中、拖拽添加、物料池管理
- `mindmap-streaming-preview`: 脑图生成过程的实时流式渲染——chunk 级更新树、进度统计、reasoning 透出
- `mindmap-node-editing`: 节点手动编辑——label/summary 编辑、增删移节点、编辑标记
- `mindmap-cross-linking`: 对话与脑图的多对多关联——`mindmapIds` 支持、关联管理 UI

### Modified Capabilities
- `mindmap-generation`: 新增内容选择输入路径、流式预览渲染、生成质量控制（few-shot prompt、结构化输出、质量校验）
- `mindmap-data`: 扩展 `MindMapNode` 数据模型（新增编辑标记、对话片段摘录），移除 `Conversation.mindmapId` 单关联约束
- `mindmap-tree-view`: 新增编辑模式 UI、实时流式渲染模式、物料选中标记
- `mindmap-panel-layout`: 新增物料池面板区域、内容选择的 UI 入口

## Impact

- **Affected code**: `src/lib/mindmap-generator.ts`（prompt 重构、结构化输出、质量校验）、`src/types/mindmap.ts`（MindMapNode 扩展）、`src/types/conversation.ts`（mindmapId → mindmapIds）、`src/stores/mindmapStore.ts`（节点编辑 actions）、`src/stores/conversationStore.ts`（多关联）、`src/features/mindmap/MindMapPanel.tsx`（流式渲染、内容选择入口）、`src/features/mindmap/MindMapTree.tsx`（编辑模式）、`src/lib/storage.ts`（IndexedDB schema 升级）
- **Affected specs**: `mindmap-generation`（需求范围变更）、`mindmap-data`（数据模型变更）、`mindmap-tree-view`（交互模式变更）、`mindmap-panel-layout`（布局变更）
- **Breaking changes**: `Conversation.mindmapId: string | undefined` → `mindmapIds: string[]` —— 需数据迁移，旧单值映射为单元素数组
- **Dependencies**: 无新增外部依赖，利用现有 `react-markdown`、Zustand、IndexedDB 基础设施
