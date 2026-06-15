# Bottom Drawer Reader — 脑图节点阅读/编辑面板

> 将节点中完整的 HTML 内容从画布节点卡片的内部溢出问题中解耦，
> 改为「紧凑节点 + 底部抽屉阅读/编辑」的交互模式。

## Why

### 当前问题

画布节点同时承担两项职责：

1. **结构索引**（在树中定位、了解分支结构）
2. **内容消费**（阅读节点的完整 HTML 正文）

这两个职责相互冲突。画布（dagre LR 布局）要求节点尺寸可预测，但 LLM 生成的 HTML 内容长度不可控，导致：

- 节点高度膨胀（实测部分节点渲染超过 600px），远超出 dagre 估算上限（380px）
- 相邻节点在垂直方向上重叠
- 用户无法快速浏览树的结构——视线被冗长的段落占据

### 之前的尝试（失败）

Stage A1 曾用 `-webkit-line-clamp` 截断 HTML 内容，但 Bug 1 修复时将其移除，因为用户需要双击才能看到完整内容——这一交互不可发现，且打断浏览流程。

### 核心观察

用户在产品讨论中提出的判断：**画布不适合阅读长文**。脑图的本质是知识**结构**的可视化，而非内容**正文**的载体。节点应该只展示结构线索（label + short summary），完整内容在专门的面板中消费。

这与本次设计的两个约束一致：
- 节点展示完整的 LLM HTML 内容（不截断） → 在阅读面板中展示
- 画布保持紧凑、不重叠 → 节点仅展示 label + 2-3 行 summary

## What Changes

### 1. 紧凑节点（Canvas Node 精简）

节点卡片改为仅展示：
- **label**（1 行，现有 `white-space: nowrap` + `text-overflow: ellipsis`）
- **summary**（最多 3-4 行，现有 `-webkit-line-clamp: 4` 不变）
- 不再在节点中渲染完整的 HTML `content`

`RectCardNode` / `BaseNode` 中，`contentType === 'html'` 时不再 `dangerouslySetInnerHTML`，而是仅展示 summary（如果有）或 label。

dagre 的 `computeNodeSize` 同步简化：HTML 节点的 height 估算从 140-380px 降到与纯文本节点一致（56-110px）。`computeNodeSize` 的 `hasHtml` 分支可移除，`EXPANDED_HTML_HEIGHT` 常量删除。

### 2. 底部抽屉阅读面板（Bottom Drawer Reader）

画布底部增加一个面板，状态管理：

| 状态 | 触发 |
|------|------|
| **关闭** | 默认；点击画布空白 / 点击 ✕ |
| **阅读态** | 单击节点 |
| **编辑态** | 在阅读态点击「编辑」按钮 |
| **已保存** | 在编辑态点击「保存」，短暂闪烁后回到阅读态 |

面板由 handle 拖拽调整高度，范围 120px ~ 70vh。

#### 阅读态布局

```
┌──────────────────────────────────────────────┐
│ ═══ (拖拽横条)                        [✕]    │
│ 节点标题         [pattern 标签]    [✏️ 编辑]  │
│ ───────────────────────────────────────────── │
│ (DOMPurify 清洗后的 HTML 内容，带滚动)         │
│                                               │
└──────────────────────────────────────────────┘
```

- 标题 + pattern 标签展示当前节点的元信息
- 正文区域用 `dangerouslySetInnerHTML` + `sanitizeHtml()` 渲染（复用现有 `html-sanitizer.ts`）
- 支持现有的 HTML 排版（标题、列表、代码块、blockquote、表格等）

#### 编辑态布局

```
┌──────────────────────────────────────────────┐
│ ═══ (拖拽横条)                        [✕]    │
│ 节点标题         [pattern 标签]   编辑中       │
│ ───────────────────────────────────────────── │
│ ┌────────────────────────────────────────────┐│
│ │ monospace textarea，已有内容编辑            ││
│ │                                            ││
│ └────────────────────────────────────────────┘│
│                     [取消]  [保存]             │
└──────────────────────────────────────────────┘
```

- 编辑态正文替换为 textarea，展示当前节点的原始内容（对 `contentType === 'html'` 展示 HTML 源码，对 `'text'` 展示纯文本）
- header 区域增加 **内容格式选择器**（`text` / `html`），允许用户在编辑时切换节点内容的格式。切换时 textarea 内容不变，但保存时根据选中格式写入 `contentType`
- 注意：`contentType` 当前类型的定义仍包含 `'markdown'`（遗留），但产物已不再生成 markdown 格式。本 stage 将从类型中移除 `'markdown'`，收窄为 `'text' | 'html'`
- 「取消」丢弃修改，回到阅读态
- 「保存」持久化内容并回到阅读态，短暂显示「已保存」反馈
- 编辑态关闭 / 切换节点时有脏数据确认弹窗

### 3. 现有编辑器整合

当前存在 `NodeEditorCard`（双击节点打开的编辑模态框）。提案将其替代为底部抽屉的编辑态——双击节点不再打开独立模态框，而是直接打开抽屉并进入编辑态。

**交互统一**：单击节点 → 阅读态，双击节点 → 编辑态（新增），原有「双击 → NodeEditorCard」的路径废弃。

### 4. NodeEditorCard 废弃

`NodeEditorCard` 组件的职责被底部抽屉编辑态完全覆盖，移除该组件及其相关路由/引用。保留 `MindMapEditModal` 的类型定义供测试参考，实际渲染逻辑下线。

## Non-goals

- **不改变** mindmap 的数据模型（`MindMapNode` 的 `content` / `contentType` / `summary` 字段不变）
- **不改变** LLM 生成 prompt —— Agent 仍然生成完整的 HTML `content`，只是渲染位置从节点卡片移到抽屉
- **不改变** draggable / collapsible / search / filter / undo / redo 等现有交互
- **不改变** 移动端适配（本 stage 仅考虑桌面）
- **不改变** Electron 相关代码

## Interaction Flows

### 主流程

```
用户看到的节点          →  [label + summary]（紧凑卡片）
单击节点               →  底部抽屉滑出，展示完整 HTML 内容
点击「编辑」           →  抽屉切换为文本编辑器
编辑内容 → 保存        →  回到阅读态
点击画布空白或 ✕       →  关闭抽屉
```

### 与现有交互的对比

| 操作 | 当前 | 提案 |
|------|------|------|
| 查看节点内容 | 节点内直接渲染（导致膨胀） | 底部抽屉阅读 |
| 编辑节点内容 | 双击 → NodeEditorCard 模态框 | 抽屉内「编辑」按钮 |
| 调整阅读空间 | — | 拖拽抽屉高度 |
| 理解树结构 | 被长文干扰 | 画布永远是紧凑结构 |

## Capabilities

### New Capabilities
- `bottom-drawer-reader` — 底部抽屉阅读面板，承载节点 HTML 内容的阅读和编辑

### Modified Capabilities
- `mindmap-canvas-rendering` — 节点卡片不再渲染 HTML 正文，仅展示 label + summary
- `mindmap-node-editing` — 编辑入口从双击打开模态框改为抽屉内的「编辑」按钮
- `mindmap-data` — `contentType` 类型收窄为 `'text' | 'html'`，移除已不再使用的 `'markdown'`

### Removed Capabilities
- `node-editor-card` — NodeEditorCard 模态框组件下线
- `node-content-inline` — 节点内联 HTML 渲染下线

## Impact

- **新增文件**：
  - `src/features/mindmap/BottomDrawerReader.tsx` — 底部抽屉组件（阅读态 + 编辑态）
  - `src/features/mindmap/__tests__/BottomDrawerReader.test.tsx` — 抽屉测试

- **修改文件**：
  - `src/components/flow-shell/nodes/BaseNode.tsx` — 移除 `contentType === 'html'` 时的 `dangerouslySetInnerHTML`
  - `src/components/flow-shell/nodes/RectCardNode.tsx` — 不再传递 HTML content 到 body slot
  - `src/lib/mindmap-flow.ts` — `computeNodeSize` 移除 `hasHtml` 分支
  - `src/components/flow-shell/canvas/flowShellUtils.ts` — 移除 `EXPANDED_HTML_HEIGHT` 常量
  - `src/components/flow-shell/css/node.css` — 移除 `.flow-node-content` 的冗余 CSS（不再需要 HTML 内容区的复杂排版规则）
  - `src/features/mindmap/MindMapTreeNode.tsx`（或类似节点交互入口）— 单击/双击逻辑调整

- **类型变更**：
  - `MindMapNode.contentType` 从 `'text' | 'html' | 'markdown'` 收窄为 `'text' | 'html'`
  - `MindMapNodeV1.contentType`（已废弃）保持原状不变

- **移除文件**：
  - `src/features/mindmap/NodeEditorCard.tsx`

- **测试**：134 → 140+（新增 ~6 个测试覆盖抽屉的状态切换、脏数据处理、关闭行为）

- **性能**：dagre 布局节点高度从 380px 降到 <110px，布局计算量减少，ranksep 可能考虑从 160 适当下调

## Open Questions

1. **编辑态的原始内容格式**：已确认。编辑态展示原始内容（HTML 源码或纯文本），header 提供 `text` / `html` 格式切换。Markdown 不再支持。`contentType` 类型将从 `'text' | 'html' | 'markdown'` 收窄为 `'text' | 'html'`。

2. **摘要和内容的关系**：已确认。`summary` 是每个节点的必填字段，由 LLM 生成。节点卡片始终展示 `summary`，无需 fallback。
