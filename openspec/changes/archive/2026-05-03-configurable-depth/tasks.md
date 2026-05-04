## 1. 类型定义

- [x] 1.1 `src/types/mindmap.ts` MindMap 类型新增 `maxDepth?: number` 字段（1-5 或 0 = auto，默认 3）
- [x] 1.2 `src/types/index.ts` 确保导出更新

## 2. 生成逻辑参数化

- [x] 2.1 `buildSystemPrompt(maxDepth)` 参数化：prompt 文本中所有 "3" 替换为 `maxDepth`，标题级别说明从 `# / ## / ###` 变为 `# / ## / ### / #{1..maxDepth}`
- [x] 2.2 `buildSystemPrompt(maxDepth)` 自动模式（`maxDepth === 0`）：不指定具体层数，告知模型自行判断
- [x] 2.3 `parseMarkdownToTree(markdown, sourceMap?, maxDepth?)` 参数化：正则 `^(#{1,3})` → `new RegExp("^(#{1," + (maxDepth || 3) + "})")`，stack push 判断从 `depth < 3` → `depth < effectiveDepth`
- [x] 2.4 `jsonNodeToMindMapNode(item, sourceMap?, depth, maxDepth?)` 参数化：`depth < 3` → `depth < effectiveDepth`
- [x] 2.5 `generateMindmap` 从 `mindmap.maxDepth` 读取配置，传递给上述函数，默认值 3
- [x] 2.6 自动模式安全上限：解析器内部 `effectiveDepth = maxDepth === 0 ? 6 : maxDepth`
- [x] 2.7 更新单元测试：`mindmap-generator.test.ts` 覆盖 maxDepth=4、maxDepth=0 场景

## 3. UI 展开逻辑修复

- [x] 3.1 `MindMapTree.tsx:28` 修复 `canExpand` 判断：从 `depth < 2` 改为 `node.children.length > 0`
- [x] 3.2 `MindMapTree.tsx` 缩进公式从 `depth * 16` 改为 `Math.min(depth * 16, 48)` 防止深层层级文字空间不足
- [x] 3.3 深度 ≥ 4 的节点字号可选地比浅层节点小一号（`text-xs` vs `text-sm`）

## 4. 图谱设置 UI

- [x] 4.1 `MindMapPanel.tsx` 工具栏「更新图谱」按钮旁增加深度快捷下拉（compact `<select>`），选项：3层 / 4层 / 5层 / 自动
- [x] 4.2 快捷下拉切换时即时调用 `updateMindmapSettings` 保存 `maxDepth`，无需确认
- [x] 4.3 `MindMapPanel.tsx` 的 `MindmapSettingsDialog` 组件也增加「最大深度」设置区域（与快捷下拉同步）
- [x] 4.4 深度选项：3 层 / 4 层 / 5 层 / 自动（模型判断），使用 Radio 或 Select 组件
- [x] 4.5 保存时将 `maxDepth` 写入 `updateMindmapSettings`
- [x] 4.6 `mindmapStore.updateMindmapSettings` 支持 `maxDepth` 字段

## 5. 调用链传递

- [x] 5.1 `MindMapPanel.tsx` 的 `handleGenerate` 中从 `activeMindmap.maxDepth` 读取值，传递给 `generateMindmap`
- [x] 5.2 `buildMindmapPrompt` 函数增加 `maxDepth` 参数（用于 system prompt），在当前调用处传入

## 6. 验证

- [x] 6.1 设置 depth=4 → 生成 → 验证输出包含 4 层节点
- [x] 6.2 设置 auto → 生成 → 验证模型可输出 >3 层内容，解析器上限 6 层
- [x] 6.3 有 children 的第 4 层节点可展开、折叠
- [x] 6.4 旧图谱（无 maxDepth）→ 生成默认 3 层行为不变
- [x] 6.5 所有现有测试继续通过
