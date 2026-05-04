## 1. Setup

- [x] 1.1 Install dependencies: `@xyflow/react`, `@dagrejs/dagre`
- [x] 1.2 Remove `mind-elixir` and `simple-mind-map` dependencies

## 2. Data Layer

- [x] 2.1 Create `src/lib/mindmap-layout.ts` — `treeToFlow()` + `applyLayout()` + dagre 配置
- [x] 2.2 Create `src/features/mindmap/useMindmapLayout.ts` — expand/collapse + auto-relayout

## 3. React Flow Components

- [x] 3.1 Create `MindMapNodeComponent.tsx` — custom node (label, summary, ✎/💬N, expand btn)
- [x] 3.2 Create `MindMapEdgeComponent.tsx` — smoothstep bezier edge
- [x] 3.3 Rewrite `MindMapTree.tsx` — ReactFlow container + state wiring

## 4. Interactions

- [x] 4.1 Create `MindMapEditModal.tsx` — double-click → centered Modal
- [x] 4.2 Create `MindMapContextMenu.tsx` — right-click → Portal menu
- [x] 4.3 Implement drag-to-reparent — onNodeDragStop + BoundingRect + reparentNode
- [x] 4.4 Wire store sync — operations → mindmapStore → re-layout

## 5. States & Layout

- [x] 5.1 Empty/loading/error/streaming states
- [x] 5.2 ChatPage layout: chat left (max-w-lg) + mindmap right (flex-1)
- [x] 5.3 Fullscreen mode in MindMapPanel (fixed inset-0 z-50)
- [x] 5.4 ResizableSeparator maxWidth 600→800

## 6. Testing

- [x] 6.1 Layout unit tests (`src/lib/__tests__/mindmap-layout.test.ts`)
- [x] 6.2 Component tests (`src/features/mindmap/__tests__/MindMapTree.test.tsx`)
- [x] 6.3 Manual test — verify all interactions in browser

## 7. Cleanup

- [x] 7.1 `npm run build` — zero type errors
- [x] 7.2 `npm test` — 127 tests passing
