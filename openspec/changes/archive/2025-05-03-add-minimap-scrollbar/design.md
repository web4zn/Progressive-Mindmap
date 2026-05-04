## Context

当前应用有两个主要滚动区域：`MessageList`（聊天消息）和 `MindMapTree`（思维导图树），均使用 `overflow-y-auto` 原生浏览器滚动。两者都是 DOM 渲染（非 canvas），前者是消息气泡列表，后者是递归嵌套的树节点。

现有滚动条是 CSS 定制的 4px 细线（`.thin-scrollbar`），无内容预览或导航增强功能。

我们需要在不引入外部依赖、不破坏现有布局的前提下，为两个滚动区域添加 minimap 缩略图。

**版本变更说明（v1 → v2）**: 初版采用 CSS transform clone 方案。实际验证发现视觉效果差（文字缩小后模糊成灰块，聊天区尤其严重），已改为 Canvas 抽象色块渲染方案。拖动逻辑不变（两者都是线性 Y 坐标 → scrollTop 映射）。

## Goals / Non-Goals

**Goals:**
- 提供一个通用的、可复用的 `Minimap` 组件
- 使用原生 Canvas API 绘制内容的抽象化缩略图（色块而非文字）
- 实时同步滚动位置（真实视图 → minimap 覆盖层）
- 支持在 minimap 上点击和拖拽进行导航（minimap → 真实视图）
- 内容变化时自动更新 minimap（新消息、节点展开/折叠）
- 零外部依赖，纯 Canvas API + React hooks

**Non-Goals:**
- 不支持移动端（minimap 仅在 md+ 断点显示）
- 不修改现有 scroll 行为（auto-scroll、smooth scroll 等保持不变）
- 不支持搜索高亮标记（未来可扩展，但不在本次范围）

## Decisions

### Decision 1: Canvas 抽象色块渲染（v2）

**选择**: 原生 `<canvas>` 元素，遍历内容 DOM 中带 `data-minimap-item` 标记的子元素，测量每个子元素的 `offsetHeight` 后按比例绘制为色块。

**渲染逻辑**:
- **聊天区**: 每个消息绘制为色块。用户消息 → `bg-primary` 色块，AI 消息 → `bg-muted` 色块，高度 ∝ 消息的 `offsetHeight`
- **导图区**: 每个节点绘制为色块。根节点 → 高亮色块，子节点 → 递减亮度色块，左侧缩进 ∝ 节点 depth

**Canvas 绘制流程**:
```
遍历 contentRef 内所有 [data-minimap-item] 元素
  → 读取 element.offsetHeight
  → 计算 blockHeight = (offsetHeight / scrollHeight) × canvasHeight
  → canvas.fillRect(x, y, width, blockHeight)
  → y += blockHeight
```

**拖动**: Y 坐标 → scrollTop 线性映射，与 CSS clone 方案完全相同。
```
scrollTop = (clickY / canvasHeight) × scrollHeight - clientHeight / 2
```

**备选方案**:
- CSS Transform Clone（v1 已弃用）: 视觉效果差，文字缩小后模糊成灰块，聊天区 Avatar/Markdown/代码块混杂无区分度。
- html2canvas: 引入 70KB+ 依赖。本质仍是"硬压缩截图"，不解决抽象化问题。
- 外部 Canvas 库（D3.js / react-konva）: 引入 50-80KB 依赖，过度工程。我们的绘制需求极简（画色块矩形）。

**理由**: Canvas 方案用最小的代码成本（~150 行），实现了：
1. 清晰的视觉区分（用户消息 vs AI 消息用不同颜色，树节点用递减亮度）
2. 零 DOM 复制开销（不再 cloneNode）
3. 零外部依赖
4. 拖动逻辑与 v1 一致，无需重写

### Decision 2: data-minimap-item 标记策略

**选择**: 内容方在需要被 minimap 测量的 DOM 元素上添加 `data-minimap-item` 属性，附加类型信息。

**MessageList 标记**:
```tsx
<div data-minimap-item={msg.role} key={msg.id} className="group">
```
- 值为 `"user"` 或 `"assistant"`，Canvas 据此选择色块颜色。

**MindMapTree 标记**:
```tsx
<div className="select-none" data-minimap-item={`depth-${depth}`}>
```
- 值为 `"depth-0"`、`"depth-1"` 等，Canvas 据此选择色块亮度和左侧缩进。

**理由**: `data-*` 属性是 HTML 标准的数据传递机制，不侵入样式系统（与 `class` 或 `style` 不同），零运行时开销。

### Decision 3: 独立组件 + 外部 ref 注入

**选择**: `Minimap` 组件接收 `scrollRef` 和可选的 `contentRef`，不提供自己的滚动容器。

**API**:
```typescript
interface MinimapProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  width?: number;       // default: 40
  className?: string;
  onDragActiveChange?: (active: boolean) => void;
}
```

**理由**: 外部 ref 注入让 `Minimap` 保持纯粹。集成方负责提供 ref 和布局调整。

### Decision 4: 布局集成方式

**MessageList**: 将 `absolute inset-0` 改为 flex row（`flex absolute inset-0`），滚动容器改为 `flex-1`，minimap 固定宽度 sibling。

**MindMapTree**: 将 `flex-1 overflow-y-auto` 改为 flex row（`flex flex-1 min-h-0`），滚动容器改为 `flex-1`。

### Decision 5: 滚动同步机制

**方向 1 (真实视图 → minimap)**: `scroll` 事件 → `requestAnimationFrame` 节流 → 更新 Canvas overlay 位置。

**方向 2 (minimap → 真实视图)**: `mousedown` + `mousemove` 拖拽 → 线性映射到 `scrollTop` → `scrollRef.scrollTo()`。

拖动逻辑为线性映射，与视觉渲染方式（CSS clone 或 Canvas）无关。

### Decision 6: 内容变化检测

**选择**: `ResizeObserver` + `MutationObserver` 双重监听

- `ResizeObserver` 监听内容区域大小变化 → 重新绘制 Canvas
- `MutationObserver` 监听内容 DOM 变化（子节点增删、节点展开/折叠）→ 重新测量并绘制（debounced 200ms）

**理由**: 与 v1 相同。Canvas 方案不需要 cloneNode，改为遍历测量 `[data-minimap-item]` 元素后 `clearRect + fillRect`，性能更好。

### Decision 7: 最小显示阈值

当 `scrollHeight <= clientHeight * 1.2` 时隐藏 minimap。

### Decision 8: 暗色模式适配

Canvas 绘制时使用 CSS 变量对应的色值：
- 聊天用户消息: `bg-primary` → 主题主色
- 聊天 AI 消息: `bg-muted` → 降低对比度的次级色
- 导图节点: 按 depth 递减亮度
- 覆盖层: `bg-primary/20` → 半透明主色

通过 `getComputedStyle` 在运行时读取 CSS 变量，自动适配主题切换。

## Risks / Trade-offs

| 风险 | 严重度 | 缓解措施 |
|------|--------|----------|
| Canvas 无法反映实际文本内容（只能看到色块结构） | 低 | 这是设计目标而非风险。Canvas 方案提供「抽象鸟瞰」，不影响滚动导航功能。 |
| Canvas 绘制频率在流式更新时过高 | 低 | MutationObserver debounce 200ms，合理降低绘制频率。流式更新时内容高度连续变化，ResizeObserver 保证最终准确。 |
| `data-minimap-item` 标记未添加导致 Canvas 空白 | 低 | 组件内部 fallback：无 `[data-minimap-item]` 时，对 `contentRef` 的直接子元素做兜底测量。 |
| Canvas 尺寸为 0 导致 draw 不执行 | 极低 | 始终在 ResizeObserver 触发后或最小尺寸（40px × 1px）下重绘。 |
| 点击 minimap 导航与自动滚动（MessageList 的 autoScroll）冲突 | 中 | 拖拽时通过 `onDragActiveChange` 暂停 autoScroll，释放后 2 秒恢复。 |
| 暗色模式切换时 Canvas 颜色不更新 | 低 | 监听 `matchMedia('(prefers-color-scheme: dark)')` 变化事件，触发重绘。 |
