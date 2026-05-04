## Context

当前深度限制在四处硬编码：

```
位置                          硬编码值             影响
──────────────────────────────────────────────────────────
buildSystemPrompt              3 (文本)            模型不敢输出深层结构
parseMarkdownToTree regex      #{1,3}              解析器丢弃第4+层
parseMarkdownToTree stack      depth < 3            第3层子节点不被追踪
jsonNodeToMindMapNode          depth < 3            JSON解析同
MindMapTree.tsx                depth < 2 (bug!)    第3层有children也不展开
```

改任何一个位置都需要碰多个文件。目标是参数化所有路径。

## Goals / Non-Goals

**Goals:**
- `maxDepth` 作为图谱级配置项，范围 3-5 或「自动」
- 所有硬编码替换为参数传递
- UI 修复：节点是否可展开取决于实际是否有 children，而非硬编码层级
- 「自动」模式让模型自行判断深度
- 向后兼容：旧图谱默认 3 层

**Non-Goals:**
- 不改变每节点最大子节点数（10）
- 不添加深度验证之外的新生成质量特性
- 不改变 Markdown 导出的深度限制（`export.ts` 已是 `depth < 5`）

## Decisions

### Decision 1: `maxDepth` 存储策略

使用 `0` 表示「自动」模式，避免引入新的 enum/string。`1-5` 有效，`0` = auto，`undefined` = 默认 3（向后兼容）。

**Alternative considered**: `{ mode: 'fixed' | 'auto', value?: number }`。拒绝原因：过度设计，一个 number 足够。

### Decision 2: 参数传递方式

所有函数增加 `maxDepth` 参数，从 `MindMapPanel` 一路传到底层解析函数。不引入全局配置或 context — 保持函数式、可测试。

### Decision 3: 「自动」模式 prompt 策略

当 `maxDepth === 0`，prompt 改为：

```
「深度不做硬性限制。根据内容的知识密度自行判断：
  - 表层概念用较少层级
  - 技术细节、方法论可以到 4-5 层
  - 不要让无关紧要的细节占据层级」
```

解析器安全上限设为 6 层（防止极端输出）。

### Decision 4: UI 展开逻辑修复

当前 `MindMapTree.tsx:28`：

```typescript
const canExpand = depth < 2  // BUG: 第3层 (depth=2) 不可展开
```

改为：

```typescript
const canExpand = node.children.length > 0  // 数据驱动
```

### Decision 5: 工具栏快捷切换

在「更新图谱」按钮旁增加一个紧凑的深度下拉（`<select>` 或自定义下拉），选项与设置弹窗一致。切换时通过 `updateMindmapSettings` 即时保存，无需额外确认。

**Alternative considered**: 只在设置弹窗里配置。拒绝原因：用户调整深度是高频试探操作（试一下 4 层效果好不好），每次进设置太繁琐。

## Risks / Trade-offs

- **[风险] 深层树 UI 拥挤**: 4-5 层后缩进量叠加可能导致文本空间不足 → **缓解**: 缩进量随深度递减（`depth * 16` → `min(depth * 16, 48)`），深层用更小的字号
- **[风险] 「自动」模式下模型输出过深**: 模型可能输出 10 层 → **缓解**: 解析器安全上限 6 层
- **[风险] 性能**: 深层树渲染节点数可能从 30 到 100+ → **缓解**: 当前非 canvas 渲染，React 虚拟列表在未来考虑；当前阶段先不做（< 200 节点性能足够）
