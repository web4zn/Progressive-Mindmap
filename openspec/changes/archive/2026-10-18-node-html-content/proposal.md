## Why

当前脑图节点使用 markdown（`react-markdown` + `remark-gfm`）渲染富文本内容。但 GFM 的 expressive 能力有限——没有表格、没有内联样式、没有真正的排版控制。用户反馈节点内容太简单、脑图不够好看，参照 Dify 的视觉质量还有很大差距。

HTML 直接渲染可以获得丰富的排版能力，配合合理的标签白名单 + XSS 防护，是脑图节点内容渲染的更好选择。

## What Changes

- 新增 `DOMPurify` 依赖，对 LLM 生成的 HTML 做 XSS 清洗
- `FlowNode.tsx`: `react-markdown` 替换为 HTML 渲染（`dangerouslySetInnerHTML` + sanitize）
- `MindMapEditModal.tsx`: markdown 编辑器替换为 HTML 编辑器（带实时预览）
- Agent system prompt: 告知 LLM 用 HTML 格式生成 `content` 字段，列出允许的标签
- `contentType` 字段从 `'markdown'` 改为 `'html'`
- 移除 `react-markdown` 和 `remark-gfm` 依赖（**BREAKING**: 已存 markdown 内容不会自动转 HTML）

## Capabilities

### New Capabilities
- `node-html-render`: 脑图节点支持 HTML 富文本渲染，带 XSS 安全滤网
- `node-html-agent`: Agent 生成 HTML 内容填充节点 `content` 字段

### Modified Capabilities
- `mindmap-node-editing`: 节点编辑面板支持 HTML 编辑 + 预览
- `mindmap-data`: `contentType` 属性值从 `'markdown'` 改为 `'html'`

## Impact

- **新增依赖**：`dompurify` + `@types/dompurify`
- **移除依赖**：`react-markdown`、`remark-gfm`
- **修改文件**：`FlowNode.tsx`、`MindMapEditModal.tsx`、`system-prompt.ts`、`agent-tools.def.ts`、`schema.ts`、`agent/types.ts`、`agent/agent-tools.ts`
- **类型变更**：`contentType` 从 `'text' | 'markdown'` 改为 `'text' | 'html'`
