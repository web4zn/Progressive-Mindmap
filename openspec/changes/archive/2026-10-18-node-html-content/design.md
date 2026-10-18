## Context

当前 FlowNode 使用 `react-markdown` + `remark-gfm` 渲染节点富文本。这个组合支持基本的 GFM 语法（标题、列表、代码块等），但不支持表格（`remark-gfm` 的表格支持有兼容问题）、内联样式、颜色等。

目标：换为 HTML 渲染，在确保安全的前提下获得完整的排版能力。

## Goals / Non-Goals

**Goals:**
- 节点内容支持 HTML 格式，能渲染表格、带样式的文本、语义化结构
- XSS 安全：LLM 生成的 HTML 经过 DOMPurify 清洗后再渲染
- Agent 能生成 HTML 内容
- 编辑面板支持 HTML 编辑

**Non-Goals:**
- 不支持 script、iframe、onclick 等危险标签
- 不支持自定义 CSS（只用预定义的标签语义）
- 不转换已有 markdown 内容为 HTML（存量节点保持 text 类型手动迁移）

## Decisions

### Decision 1: 渲染方式 — `dangerouslySetInnerHTML` + DOMPurify

最简单的 HTML 渲染方式。性能好，不需要额外的虚拟 DOM 转换。

```tsx
import DOMPurify from 'dompurify'

const safeHtml = DOMPurify.sanitize(data.content, {
  ALLOWED_TAGS: ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'code', 'pre', 
                  'strong', 'em', 'a', 'blockquote', 'table', 'thead', 
                  'tbody', 'tr', 'th', 'td', 'br', 'hr', 'span', 'div'],
  ALLOWED_ATTR: ['href', 'title', 'class'],
})
```

**不考虑** `html-react-parser`：多一层依赖，且对性能无实质帮助。

### Decision 2: 允许的 HTML tag 白名单

| 标签 | 用途 |
|------|------|
| `h2` `h3` `h4` | 标题层级 |
| `p` `br` `hr` | 段落、换行、分割线 |
| `ul` `ol` `li` | 列表 |
| `strong` `em` | 强调 |
| `code` `pre` | 代码 |
| `a` (只允许 `href` `title`) | 链接 |
| `blockquote` | 引用 |
| `table` `thead` `tbody` `tr` `th` `td` | 表格 |
| `span` `div` | 容器（只保留 `class`）|

禁止：`script`、`iframe`、`img`、`style`、`svg`、事件属性（`onclick` 等）。

### Decision 3: 编辑面板

两种选项：
- A. 纯 HTML textarea + 实时预览（简单，适合开发者）
- B. 富文本编辑器（如 `@tiptap/react`）（用户友好，但引入大依赖）

**选 A**：MVP 阶段 HTML textarea 够用，预览用 `dangerouslySetInnerHTML` 实时渲染。后续可以升级。

### Decision 4: 存量数据

已有 markdown 内容不会自动转换。`contentType === 'markdown'` 的节点继续用 markdown 渲染（保留 `react-markdown` 作为兼容路径，但不推荐新内容使用）。

或者：直接移除 markdown 支持，存量 markdown 内容按纯文本渲染。

## System Prompt Changes

告知 Agent 内容格规则从 markdown 切到 HTML：

```
content 字段使用 HTML 格式。允许的标签：
- 标题：<h2> <h3> <h4>
- 段落：<p> <br> <hr>
- 列表：<ul> <ol> <li>
- 代码：<pre><code>
- 强调：<strong> <em>
- 链接：<a href="...">（href 是唯一属性）
- 引用：<blockquote>
- 表格：<table> <thead> <tbody> <tr> <th> <td>

禁止：<script> <iframe> <img> <style> onclick 等事件属性
content 控制在 300-800 字以内
```

## File Structure

```
修改：
  src/components/flow-shell/FlowNode.tsx     — markdown → HTML 渲染
  src/features/mindmap/MindMapEditModal.tsx   — markdown → HTML 编辑
  src/lib/agent/system-prompt.ts             — prompt 切到 HTML
  src/lib/agent/types.ts                     — contentType 类型
  src/lib/agent/agent-tools.ts               — newNodeFromOp + update
  src/lib/agent/agent-tools.def.ts           — 工具输入 schema
  src/lib/agent/schema.ts                    — Zod schema

新增依赖：
  dompurify + @types/dompurify

可选移除：
  react-markdown + remark-gfm（**聊天消息 MessageBubble.tsx 仍然依赖，不移除**）
```
