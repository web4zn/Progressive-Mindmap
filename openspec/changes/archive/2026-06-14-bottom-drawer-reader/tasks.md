# Bottom Drawer Reader — Tasks

## Task 1: Type cleanup

`MindMapNode.contentType` 从 `'text' | 'html' | 'markdown'` 收窄为 `'text' | 'html'`。

- [x] `src/types/mindmap.ts`: v2 `MindMapNode.contentType` 移除 `'markdown'`
- [x] 搜索全仓库 `'markdown'` 字符串引用，清理多余的条件分支

**交付物**：类型变更 + 编译通过

---

## Task 2: Node simplification

画布节点不再渲染 HTML 正文。

- [x] `BaseNode.tsx`: 移除 `contentType === 'html'` 时的 `dangerouslySetInnerHTML` 分支。节点 body 为空时仅展示 summary（已由 `.flow-node-summary` 渲染）
- [x] `BaseNode.tsx`: `safeHtml`、`hasHtml` 相关代码移除
- [x] `RectCardNode.tsx`: 确认 body slot 传 `null` 后 BaseNode 的 fallback 逻辑不再渲染 HTML
- [x] `mindmap-flow.ts`: `computeNodeSize` 移除 `hasHtml` 参数和 `contentLength` 参数
- [x] `mindmap-flow.ts`: 移除 export `ComputeNodeSizeInput` 中的 `hasHtml`、`contentLength` 字段
- [x] `mindmap-flow.ts`: 方法体简化为纯文本节点的计算逻辑（width 120-280, height 56-110）
- [x] `flowShellUtils.ts`: 移除 `EXPANDED_HTML_HEIGHT` 常量
- [x] `flowShellUtils.ts`: `applyDagreLayout` 中移除 `hasRichContent` 分支
- [x] `node.css`: 移除 `.flow-node-content` 里的 HTML 排版规则（h2, h3, ul, ol, pre, code, blockquote, table 等）
- [x] `node.css`: 移除 `.flow-node-content-clamp` 相关注释/规则
- [x] `node.css`: 简化 `.flow-node-content` 样式（不再需要 flex:1 + overflow-y:auto）

**交付物**：画布节点始终紧凑，不再因 HTML 内容膨胀

---

## Task 3: BottomDrawerReader 组件

新建底部抽屉组件。

- [x] 创建 `src/features/mindmap/BottomDrawerReader.tsx`
  - 阅读态：渲染 sanitized HTML（调用已有的 `sanitizeHtml`）
  - 编辑态：textarea + 格式选择器（text / html）
  - 拖拽 handle 调整高度
  - 脏数据确认弹窗
  - 关闭/切换节点保护
- [x] 创建 `src/features/mindmap/__tests__/BottomDrawerReader.test.tsx`
  - 打开/关闭抽屉
  - 阅读 ↔ 编辑切换
  - 脏数据确认弹窗
  - 保存后回到阅读态

**交付物**：独立可用的抽屉组件

---

## Task 4: Interaction wiring

将 BottomDrawer 接入现有的交互流程。

- [x] `MindMapTree.tsx` / `FlowShell.tsx` / `CanvasLayout.tsx`: 确认单击节点触发 BottomDrawer 打开（阅读态）
- [x] 双击节点打开 BottomDrawer（编辑态）
- [x] 移除 `NodeEditorCard.tsx` 及其引用
- [x] 确保 `MindMapContextMenu.tsx` 中的"编辑"操作也指向 BottomDrawer 编辑态

**交付物**：完整交互流程，NodeEditorCard 下线

---

## Task 5: 验证

- [x] `npm run build` 通过
- [x] `npm test` 通过
- [x] 手动验证：单击节点打开抽屉阅读，编辑/保存正常，双击进入编辑态
