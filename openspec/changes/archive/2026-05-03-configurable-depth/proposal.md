## Why

当前思维导图生成在 prompt 提示词、Markdown 解析器（`#{1,3}` 正则）、JSON 解析器（`depth < 3` 判断）和 UI 渲染（`canExpand = depth < 2`）四处硬编码了 3 层深度限制。这导致知识密度高的对话被强制压缩，模型无法为复杂话题生成足够深度的树结构。需要将深度限制从硬编码改为可配置参数。

## What Changes

- **`MindMap` 新增 `maxDepth` 字段**：可设置为 3/4/5 或 `0`（自动）。**BREAKING**: MindMap 类型变更。
- **系统 prompt 参数化**：`buildSystemPrompt(maxDepth)` 替换所有硬编码的 3。
- **Markdown 解析器参数化**：`parseMarkdownToTree(markdown, sourceMap, maxDepth)`，正则从 `#{1,3}` 变为 `#{1,${maxDepth}}`。
- **JSON 解析器参数化**：`jsonNodeToMindMapNode(item, sourceMap, depth, maxDepth)`。
- **UI 展开逻辑修复**：`MindMapTree.tsx` 的 `canExpand = depth < 2` 改为基于节点实际 children 判断。
- **图谱设置 UI**：在 MindMapPanel 的设置弹窗中增加深度选择器。
- **工具栏快捷切换**：在「更新图谱」按钮旁增加深度下拉，无需进入设置即可快速切换。
- **「自动」模式**：当 `maxDepth` 为 0 时，prompt 不指定具体层数，让模型根据内容密度自行判断（安全上限 6 层）。

## Capabilities

### New Capabilities
- `configurable-mindmap-depth`: 可配置的图谱生成深度

### Modified Capabilities
- `mindmap-data`: MindMap 类型新增 `maxDepth` 字段
- `mindmap-generation`: 生成 prompt 和解析器的深度限制从硬编码改为参数化
- `mindmap-tree-view`: UI 展开逻辑修复，支持超过 3 层的深度渲染

## Impact

- **类型系统**: `src/types/mindmap.ts` MindMap 新增 `maxDepth?: number`
- **生成逻辑**: `src/lib/mindmap-generator.ts` 的 `buildSystemPrompt`、`parseMarkdownToTree`、`jsonNodeToMindMapNode`、`generateMindmap` 全部参数化
- **调用链**: `MindMapPanel.tsx` → `generateMindmap` → 各函数传递 `maxDepth`
- **UI 组件**: `MindMapPanel.tsx` 工具栏增加深度快捷下拉，设置弹窗增加深度选择器，`MindMapTree.tsx` 修复展开逻辑
- **向后兼容**: 旧图谱 `maxDepth` 为 undefined → 默认行为为 3 层
