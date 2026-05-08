## Why

当前 `MindMapNodeComponent` / `MindMapEdgeComponent` / `MindMapTree` 三者与业务逻辑高度耦合，无法单独复用。将纯 UI 视图层抽离为 `FlowShell` 组件，既是本项目代码质量提升，也可直接复制到其他 React Flow 项目使用。

## What Changes

- 新建 `src/components/flow-shell/` 目录，包含：
  - `FlowShell.tsx` — 画布壳（Background + Controls + MiniMap + theme + dagre 布局）
  - `FlowNode.tsx` — Rich 节点卡片（层级渐变色条 + label + summary + markdown 正文 + 折叠按钮 + 编辑标记）
  - `FlowEdge.tsx` — Smoothstep 边线
  - `index.ts` — 统一导出
- `MindMapTree.tsx` 重构为胶水层：导入 FlowShell，注入 `design=rich`、`pattern=auto`、`theme=dark`，连接 store 和事件
- `MindMapNodeComponent.tsx` / `MindMapEdgeComponent.tsx` 删除，替换为 FlowShell 内置实现
- FlowShell 零业务依赖：不 import `mindmapStore`、`MindMapNode` 类型、项目 Tailwind 配置

## Capabilities

### New Capabilities
- `flow-shell-reusable`: 可复用的 React Flow 画布组件——节点卡片（Rich variant + 层级渐变 + dark/light 主题）、边线（Smoothstep）、画布壳（Background/Controls/MiniMap）、主题 CSS 变量

### Modified Capabilities
- `mindmap-canvas-rendering`: MindMapTree 从直接使用 React Flow 改为导入 FlowShell
- `mindmap-tree-view`: 节点/边组件替换为 FlowShell 内置实现

## Impact

- `src/components/flow-shell/` — 新增 4 文件，零业务依赖
- `src/features/mindmap/MindMapTree.tsx` — 重构为胶水层（307→~100 行）
- `src/features/mindmap/MindMapNodeComponent.tsx` — 删除
- `src/features/mindmap/MindMapEdgeComponent.tsx` — 删除
- `src/features/mindmap/__tests__/MindMapTree.test.tsx` — 更新 mock
