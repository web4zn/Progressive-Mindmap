## Tasks

### 1. 数据模型扩展
- [ ] `src/types/mindmap.ts`：MindMapNode 新增 `content?: string`、`contentType?: 'text' | 'markdown'` 字段
- [ ] `src/lib/mindmap-generator.ts`：`parseJsonToTree` / `jsonNodeToMindMapNode` 解析新增字段

### 2. 添加 KaTeX 依赖
- [ ] 安装 `katex`、`remark-math`、`rehype-katex`
- [ ] 导入 KaTeX CSS（`katex/dist/katex.min.css`）到 `src/index.css`

### 3. 节点渲染支持 Markdown
- [ ] `src/features/mindmap/MindMapNodeComponent.tsx`：`contentType === 'markdown'` 时使用 `react-markdown` 渲染 `content`（含 `remarkMath` + `rehypeKatex` 插件）
- [ ] 节点尺寸适配：rich content 节点预留更大高度

### 4. 编辑 Modal 扩展
- [ ] `src/features/mindmap/MindMapEditModal.tsx`：新增 Markdown 编辑区（textarea）和预览切换按钮
- [ ] 保存时将编辑结果写回 `content` 字段

### 5. 生成 prompt 更新
- [ ] `src/lib/mindmap-generator.ts`：全量和增量 prompt 中指示 LLM 在节点中输出 Markdown 格式内容

### 6. 测试
- [ ] `mindmap-generator.test.ts`：验证 `contentType` 和 `content` 字段解析
- [ ] `MindMapNodeComponent` 测试：Markdown 渲染验证
- [ ] `MindMapEditModal` 测试：Markdown 编辑/预览切换
- [ ] 手动测试：图片、链接、代码块、LaTeX 公式渲染
