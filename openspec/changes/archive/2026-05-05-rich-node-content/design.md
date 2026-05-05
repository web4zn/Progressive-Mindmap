## Decisions

### D1: Markdown 渲染策略

**选择**：节点使用 `react-markdown` 渲染，复用已有的 remark/rehype 插件链。

**替代方案**：
- 自定义 RichText 编辑器（如 Slate.js）：过于重型，富内容需求本质是展示优先
- 纯 HTML 渲染（dangerouslySetInnerHTML）：安全风险，Markdown 已是 AI 输出的自然格式

**决策依据**：项目已依赖 `react-markdown` + `remark-gfm` + `rehype-highlight`，零额外依赖开销。节点的富内容需求 90% 是展示，编辑用纯文本输入+预览切换即可。

### D2: 数据模型扩展方式

**选择**：新增可选字段 `content?: string` 和 `contentType?: 'text' | 'markdown'`，保持 `label` + `summary` 不变。

**替代方案**：
- 将 `summary` 替换为 `content`：BREAKING，现有代码大量引用 `summary`
- 存 HTML 而非 Markdown：增加存储体积，Markdown 更易于 AI 生成

**决策依据**：向后兼容优先。`label` 仍用于节点标题显示和 dagre 布局计算，`summary` 保留用于纯文本场景，`content` 给需要富文本的场景。`contentType` 默认为 `'text'`，与当前行为一致。

### D3: LaTeX 渲染

**选择**：使用 KaTeX 而非 MathJax，通过 `remark-math` + `rehype-katex` 插件。

**决策依据**：KaTeX 比 MathJax 快 5-10 倍，适合节点内联渲染。包体积更小（~280KB vs ~1.5MB）。

### D4: 编辑体验

**选择**：编辑 Modal 中新增 Markdown 编辑模式，提供「编辑/预览」切换按钮。默认编辑模式为源码编辑。

**决策依据**：用户群体倾向开发者（需要配 API key），Markdown 源码编辑门槛可接受。预览切换降低心智负担。

### D5: 节点尺寸计算

**选择**：dagre 布局高度估算 Markdown 渲染后高度的 1.2 倍余量。

**决策依据**：dagre 需要预先知道节点尺寸，但 Markdown 渲染高度是动态的。先估算，布局后通过 `onNodesChange` 微调。
