## Context

当前 `MindMapTree`（307 行）将 React Flow 初始化、dagre 布局、节点/边渲染、事件处理全部耦合在一起。`MindMapNodeComponent`（89 行）和 `MindMapEdgeComponent`（26 行）与项目类型强绑定。需要抽离可复用的纯 UI 层。

## Goals / Non-Goals

**Goals:**
- `FlowShell` 组件零业务依赖，可直接复制到其他项目
- 节点升级为 Rich 卡片（层级渐变色条 + Markdown 正文 + 折叠按钮）
- 暗色主题默认，CSS 变量控制
- 现有交互逻辑（双击/右键/拖拽）保持不变
- `MindMapTree` 变薄为胶水层

**Non-Goals:**
- 不改变 store 或数据流
- 不改变编辑模态框/右键菜单
- 不实现自定义布局引擎（仍用 dagre）

## Decisions

### Decision 1: FlowShell 使用泛型 props

```typescript
interface FlowShellProps<T extends { id: string; children?: T[]; depth?: number }> {
  tree: T[]
  getLabel: (node: T) => string
  getSummary?: (node: T) => string
  getContent?: (node: T) => string | undefined
  getContentType?: (node: T) => 'text' | 'markdown' | undefined
  isEdited?: (node: T) => boolean
  theme?: 'dark' | 'light'
  pattern?: string
  layout?: 'dagre-lr' | 'dagre-tb'
  onNodeDoubleClick?: (node: T) => void
  onNodeContextMenu?: (event: MouseEvent, node: T) => void
  onNodeDragStop?: (dragged: T, target: T | null) => void
}
```

通过 accessor 函数解耦 MindMapNode 类型依赖。

### Decision 2: 层级色条用 CSS opacity 渐变

```
depth 0: opacity-100 (最浓)
depth 1: opacity-80
depth 2: opacity-60
depth 3: opacity-40
depth 4+: opacity-20
```

不需要 JS 计算，纯 CSS。

### Decision 3: Pattern 配色映射

```
auto:      蓝色系 hsl(217, 91%, 60%)
5w1h:      绿色系 hsl(142, 71%, 45%)
tech:      紫色系 hsl(271, 91%, 65%)
pros-cons: 琥珀系 hsl(37, 92%, 50%)
```

### Decision 4: 文件结构

```
src/components/flow-shell/
├── FlowShell.tsx    ← 主组件，dagre 布局 + ReactFlow 初始化
├── FlowNode.tsx     ← Rich 节点卡片
├── FlowEdge.tsx     ← Smoothstep 边线
├── flow-shell.css   ← CSS 变量 + 动画
└── index.ts         ← 导出 FlowShell + 类型
```

### Decision 5: 不引入新依赖

只用已有的 `@xyflow/react` + `@dagrejs/dagre`。不引入 `elkjs` 或其它布局库。
