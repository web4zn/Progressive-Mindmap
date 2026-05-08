## 1. FlowShell 组件

- [x] 1.1 创建 `src/components/flow-shell/FlowShell.tsx` — 画布壳（ReactFlow + dagre 布局 + Background + Controls + MiniMap）
- [x] 1.2 创建 `src/components/flow-shell/FlowNode.tsx` — Rich 节点（层级色条 + label + summary + content + 折叠 + 编辑标记）
- [x] 1.3 创建 `src/components/flow-shell/FlowEdge.tsx` — Smoothstep 边线
- [x] 1.4 创建 `src/components/flow-shell/flow-shell.css` — CSS 变量 + dark/light 主题 + 动画
- [x] 1.5 创建 `src/components/flow-shell/index.ts` — 统一导出 + 类型

## 2. MindMapTree 重构

- [x] 2.1 `MindMapTree.tsx` 导入 FlowShell，删除裸 ReactFlow 代码
- [x] 2.2 注入 theme="dark"，pattern 暂时硬编码 "auto"（`add-mindmap-pattern` 完成后改为动态）
- [x] 2.3 保留所有事件处理（双击/右键/拖拽/折叠/编辑）
- [x] 2.4 保留 useMindmapLayout 用于折叠状态管理 + `treeRef.current` 用于树操作

## 3. 清理旧组件

- [x] 3.1 删除 `src/features/mindmap/MindMapNodeComponent.tsx`
- [x] 3.2 删除 `src/features/mindmap/MindMapEdgeComponent.tsx`

## 4. 测试

- [x] 4.1 更新 `MindMapTree.test.tsx` mock（FlowShell 替代 @xyflow/react 直接 mock）
- [x] 4.2 `npm test` 全部通过 (69 tests)
- [x] 4.3 `npm run lint` 通过 (0 errors)
