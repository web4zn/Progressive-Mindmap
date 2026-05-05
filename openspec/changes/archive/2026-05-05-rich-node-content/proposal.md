## Why

当前脑图节点仅支持纯文本 label + summary，无法嵌入图片、链接、LaTeX 公式、代码块等富内容。用户从对话中提取的知识经常包含这些元素，丢失它们等于丢失了知识完整性。对比 simple-mind-map 等成熟脑图工具均支持富文本节点，这是用户期望的标配能力。

## What Changes

- **MindMapNode 数据模型扩展**：新增 `contentType` 字段（`text` / `markdown`），新增 `content` 字段承载富文本
- **节点渲染支持 Markdown**：自定义节点组件使用 `react-markdown` 渲染 `content`，支持图片、链接、行内代码、LaTeX 公式（KaTeX）
- **AI 生成输出 Markdown 节点内容**：prompt 指示 LLM 输出含 Markdown 格式的节点 summary/content
- **内联编辑支持 Markdown**：编辑 Modal 中 content 输入扩展为 textarea（标记为 Markdown 输入），提供预览切换
- **向后兼容**：`label` + `summary` 保持不变；`contentType: 'text'` 时行为与当前完全一致

## Capabilities

### New Capabilities
- `rich-node-content`: 脑图节点支持 Markdown 富文本内容（图片、链接、代码、LaTeX），渲染与编辑均支持

### Modified Capabilities
- `mindmap-data`: MindMapNode 新增 `contentType` 和 `content` 字段
- `mindmap-generation`: prompt 扩展，指示 LLM 输出 Markdown 格式节点内容
- `mindmap-node-editing`: 编辑 Modal 扩展 Markdown 输入与预览

## Impact

- **依赖新增**：`katex` + `remark-math` + `rehype-katex`（LaTeX 渲染）
- **数据模型**：`src/types/mindmap.ts` MindMapNode 扩展
- **渲染组件**：`src/features/mindmap/MindMapNodeComponent.tsx` 改用 react-markdown
- **编辑组件**：`src/features/mindmap/MindMapEditModal.tsx` 新增 Markdown 编辑/预览
- **生成逻辑**：`src/lib/mindmap-generator.ts` prompt 更新
- **布局**：dagre 节点尺寸需考虑富内容高度动态变化
