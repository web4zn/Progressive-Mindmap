## Context

当前应用是一个运行在浏览器中的 LLM 聊天客户端，数据模型以 Conversation 为核心，包含 message[] 列表。Conversation 之间完全独立，不存在跨会话的知识关联。用户希望引入思维导图（MindMap）作为跨会话的知识聚合层。

技术栈：React 18 + TypeScript + Zustand (persist middleware) + Tailwind CSS v4 + shadcn/ui + IndexedDB (idb)。LLM 调用通过 OpenAI-compatible SDK 进行流式请求。

## Goals / Non-Goals

**Goals:**
- 建立 MindMap 作为与 Conversation 平行的第一类实体，独立存储和生命周期
- Conversation 可选择性关联到某个 MindMap（零对一或一对一关系）
- LLM 自动从对话内容生成树形结构（Markdown 标题 → 树节点）
- 支持手动同步（用户主动触发）和自动同步（每次对话后自动更新）两种模式
- 右侧可拖拽面板渲染树形视图，全局开关控制显示/隐藏
- 新建对话时询问用户图谱关联（跳过/选择已有/创建新的）

**Non-Goals:**
- 不实现图状结构（节点+边的关系图谱），仅限树形结构
- 不实现节点的手动编辑（拖拽、增删节点），v1 仅支持 LLM 生成 + 查看
- 不实现节点间的交叉引用或多父节点
- 不实现实时协作或云端同步
- 不实现思维导图的图片导出 / PDF 导出（仅支持 Markdown 导出）

## Decisions

### Decision 1: 树形渲染方案 — 自定义递归 React 组件

**选择**: 自定义递归 `<TreeNode>` 组件，CSS + 缩进 + 可选 SVG 连接线

**替代方案**:
- `markmap`：Radial 布局需要较大空间，350px 宽度无法有效展示；Bundle 约 50KB
- `react-d3-tree`：D3 依赖较重，窄面板下布局效果不理想
- `react-flow`：面向图编辑而非树浏览，Bundle 约 200KB，过度设计

**理由**: 零外部依赖，完全 Tailwind 兼容（暗色/亮色主题自动适配），缩进式列表在窄面板下是最优布局方案。当前场景无需节点拖拽、多重连接等高级功能，自定义组件即可满足需求。

### Decision 2: LLM 输出格式 — Markdown 标题

**选择**: 让 LLM 输出 Markdown 标题结构（`#` / `##` / `###`），客户端解析为树节点

**替代方案**:
- JSON 结构化输出：不同模型对 JSON mode 支持不一致（Ollama 等本地模型可能不支持 strict JSON schema），且 JSON 不适合流式展示中间状态
- Function Calling with schema：强依赖特定 provider，跨模型兼容性差

**理由**: Markdown 是 LLM 训练数据中天然存在的格式，所有模型都能稳定输出。支持流式渲染中间状态（逐行显示 Markdown 并实时解析为树）。解析规则简单：`#` → 根节点，`##` → 一级子节点，`###` → 二级子节点，限制最大 3 层深度。

**Markdown 输出格式约定**:
```markdown
# 主题名称
简要概述（作为根节点描述）

## 子主题 — 简短说明
关于该子主题的 1-2 句描述

### 细节主题 — 简短说明
更多细节说明
```

使用 `—` 作为标题与描述的分隔符；无分隔符时整行作为节点名称。

### Decision 3: 增量更新策略 — 全量重新生成

**选择**: 每次触发同步时，将已有的完整树（Markdown 格式）+ 所有关联 Conversation 的消息发送给 LLM，LLM 输出完整的合并后树

**替代方案**:
- 仅发送新增对话内容，LLM 输出 diff/新增节点：合并逻辑复杂，新增节点可能重复或位置不当
- 先提取主题再插入：需要两次 LLM 调用，延迟更高

**理由**: 全量生成逻辑最简单，LLM 自然理解整个上下文并输出一致的结果。树的 Markdown 体积很小（通常 < 2KB），token 成本可忽略。主要成本来自对话消息内容，而非树结构本身。

### Decision 4: 同步模式 — 两种模式共存，默认手动

**选择**: 
- 全局层面：MindMap 数据结构不感知同步模式
- Conversation 层面：`autoSync: boolean` 字段控制，默认 `false`（手动模式）
- 自动模式触发时机：AI 回复完成后的 3 秒 debounce

**替代方案**:
- 全局开关控制所有 conversation：粒度太粗，用户可能希望某些严肃对话不污染图谱
- 每条消息后立即同步：高频触发导致过多 LLM 调用

**理由**: Per-conversation 粒度最大化用户控制。debounce 避免快速连续对话中的冗余同步。

### Decision 5: 生成模型选择 — 自动选择，可覆盖

**选择**: 默认使用当前 Conversation 的模型进行图谱生成。在 MindMap 设置中可指定专用的"生成模型"覆盖默认。

**理由**: 保持用户配置简单（零额外配置即可使用），同时为高级用户提供分离模型的能力（如用便宜的模型专门生成图谱）。

### Decision 6: MindMap 与 Conversation 的关系

**选择**: One-to-Many（一个 MindMap 关联多个 Conversation），每个 Conversation 最多关联一个 MindMap

```
Conversation.mindmapId: string | undefined  // nullable
```

**理由**: 语义清晰——用户用多个对话研究一个主题，产出一个图谱。Conversation 不关联任何图谱是合法的默认状态。

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LLM 输出格式不符合约定（非标准 Markdown） | 解析失败，图谱为空 | 解析器做防御性处理：忽略非标题行、限制深度、截断过长标签；显示原始 Markdown 作为降级展示 |
| 全量重新生成的 token 成本随关联对话增多而增长 | 大量对话时成本高 | 单次生成限制最多关联 10 个 Conversation；提示用户"合并中有 N 个对话..."；未来可优化为增量 diff |
| 自动同步模式下高频 LLM 调用 | API 费用和使用量 | 3 秒 debounce；自动模式开关时显示成本提示 |
| 树深度过大导致渲染性能问题 | 面板卡顿 | 限制最大 3 层深度（LLM prompt 侧限制）；展开/折叠状态管理减少 DOM 节点；大规模时考虑虚拟化 |
| IndexedDB 存储量大对话导致图谱生成慢 | 用户体验下降 | 生成过程显示进度状态（"正在分析对话..."→"正在生成图谱..."）；过长对话可截断消息（取最近 50 条）|
| 多个 Conversation 对同一主题有冲突信息 | 图谱内容不一致 | LLM 自然处理矛盾（类似多文档摘要）；不引入特殊的去重或冲突解决逻辑 |

## Open Questions

- 是否需要节点的手动编辑功能（增删改节点）？v1 暂不实现，用户反馈后评估
- MindMap 是否需要导出为图片（PNG/SVG）？v1 仅支持 Markdown 导出
- 侧边栏中 MindMap 列表与 Conversation 列表的空间分配？当前设计为 MindMap 列表紧随 Conversation 列表下方
- 是否需要 MindMap 节点与具体消息的溯源链接（点击节点跳转到对应消息）？v1 暂不实现，树节点通过 `sourceConversationIds` 字段记录来源
