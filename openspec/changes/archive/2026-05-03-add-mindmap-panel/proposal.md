## Why

当前应用仅支持独立的会话聊天，用户与 AI 的对话内容在会话之间互不关联，无法形成结构化的知识沉淀。用户希望将多次对话中的知识点自动或手动聚合为可视化的思维导图，让分散的对话内容形成系统化的知识结构。这个问题现在需要解决，因为随着对话增多，知识的碎片化趋势会愈发明显。

## What Changes

- **新增** `MindMap` 实体类型，包含树形节点数据结构，独立于 Conversation 存储
- **新增** 思维导图管理 Store，支持 CRUD 操作，数据持久化到 IndexedDB
- **新增** 右侧可拖拽调整宽度的思维导图面板（200-600px），全局开关控制显示/隐藏
- **新增** LLM 驱动的思维导图生成管道：解析 Markdown 标题结构为树节点
- **新增** 新建对话对话框，询问用户是否关联现有思维导图（跳过/选择已有/创建新的）
- **新增** 思维导图面板内的工具栏：手动同步按钮、自动同步开关、导出按钮
- **修改** `Conversation` 数据模型，新增 `mindmapId` 和 `autoSync` 可选字段
- **修改** 聊天界面布局，为思维导图面板腾出右侧空间，内容区自适应宽度
- **新增** 侧边栏"思维导图"分区，列出所有已创建的思维导图

## Capabilities

### New Capabilities

- `mindmap-data`: MindMap 实体数据模型、IndexedDB 存储、Zustand store，以及 Conversation 与 MindMap 的关联关系
- `mindmap-generation`: LLM 驱动的树形结构生成管道，包括 prompt 构建、Markdown 标题解析为树节点、流式生成、增量更新策略、生成模型选择
- `mindmap-tree-view`: 思维导图树的可视化渲染组件，递归嵌套节点、展开/折叠交互、节点高亮、空状态、加载状态
- `mindmap-panel-layout`: 右侧思维导图面板的布局集成，可拖拽分隔线调整宽度、全局开关显示/隐藏、新建对话的图谱关联对话框、面板内工具栏

### Modified Capabilities

- `conversation-management`: Conversation 数据模型扩展 `mindmapId` 和 `autoSync` 字段；新建对话流程增加思维导图关联步骤（对话框询问）
- `chat-interface`: 主内容区布局需适配右侧面板的显示/隐藏，消息列表和输入栏在面板可见时应缩小最大宽度以保持视觉平衡

## Impact

- **数据模型**: `types/conversation.ts` 新增字段；新增 `types/mindmap.ts` 定义 MindMap、MindMapNode 类型
- **Store**: 新增 `stores/mindmapStore.ts`；修改 `stores/conversationStore.ts` 支持 mindmap 相关字段
- **存储层**: `lib/storage.ts` 新增 mindmap 相关的 CRUD 方法
- **LLM 管道**: 新增 `lib/mindmap-generator.ts` 负责 prompt 构建和 Markdown 解析
- **UI 组件**: 修改 `ChatPage.tsx` 布局结构；修改 `ConversationSidebar.tsx` 新增思维导图区域；新增 `features/mindmap/` 目录（panel, tree, toolbar, generation pipeline）
- **无破坏性变更**: 所有 mindmap 字段为可选，现有会话和现有功能不受影响
- **依赖**: 无新增外部依赖，思维导图树渲染使用自定义递归 React 组件 + Tailwind CSS
