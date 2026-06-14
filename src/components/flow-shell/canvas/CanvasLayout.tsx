/**
 * CanvasLayout — mindmap-shell-v2 (task 4).
 *
 * The inner React Flow surface. Lives inside a `ReactFlowProvider`
 * (the outer `FlowShell` mounts that). Responsible for:
 *
 *  1. Running the dagre layout on the parent's raw `nodes` /
 *     `edges` whenever the *structure* changes.
 *  2. Applying decorations (dim / streaming / search-match) on
 *     a faster cadence — see `Decorators.tsx`.
 *  3. Exposing an imperative handle (`fitView`, `focusNode`,
 *     `getIntersectingNodes`, `zoomIn`, `zoomOut`) so the parent
 *     can drive the camera from outside the provider.
 *  4. Rendering the toolbar, MiniMap, and React Flow surface.
 *
 * Why a separate file: the original `FlowShell.tsx` had 565
 * lines — dagre logic, decorations, toolbar, theme wrapping, and
 * the React Flow mount all intertwined. Splitting the layout into
 * its own file is the first step in a v2 decomposition; the
 * remaining (theme, pattern, MiniMap) live in the outer
 * `FlowShell`.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type NodeChange,
  type EdgeChange,
  type ReactFlowInstance,
  type NodeMouseHandler,
  type OnSelectionChangeParams,
  type EdgeMouseHandler,
  type OnInit,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import '../flow-shell.css'
import { nodeComponents } from '../nodes'
import { edgeComponents } from '../edges'
import { FlowShellToolbar } from './Toolbar'
import FlowMiniMap from '../MiniMap'
import { useDecoratedEdges, useDecoratedNodes } from './Decorators'
import {
  applyDagreLayout,
  resolveBackgroundVariant,
  structuralFingerprint,
  mergeDecoratedNodes,
  type ShapeFlowNode,
} from './flowShellUtils'
import type { FlowShellHandle, FlowShellProps } from '../FlowShell'

/**
 * Per-edge default options. The "smoothstep" strategy is the
 * v1 visual default and ships first. v2 lets the user override
 * per-mindmap via the registry; that wiring is task 6's job.
 */
const DEFAULT_EDGE_OPTIONS = {
  type: 'smoothstep' as const,
  style: { stroke: 'var(--flow-pattern)', strokeWidth: 1.5 },
}

/**
 * Per-node MiniMap colour, derived from `data.pattern`. Pure
 * function. Kept here (not in `FlowShell`) so the canvas layout
 * is self-contained for Storybook stories.
 */
const PATTERN_MINIMAP_COLORS: Record<string, string> = {
  auto: '#3b82f6',
  '5w1h': '#22c55e',
  tech: '#8b5cf6',
  'pros-cons': '#f59e0b',
}

function patternNodeColor(node: { data?: unknown }): string {
  const data = (node.data ?? {}) as { pattern?: string }
  return PATTERN_MINIMAP_COLORS[data.pattern ?? 'auto'] ?? PATTERN_MINIMAP_COLORS.auto ?? '#3b82f6'
}

export const CanvasLayout = forwardRef<FlowShellHandle, FlowShellProps>(function CanvasLayout(
  props,
  ref,
) {
  const {
    nodes: rawNodes,
    edges: rawEdges,
    layout = 'dagre-lr',
    fitView = true,
    fitViewPadding = 0.3,
    minZoom = 0.1,
    maxZoom = 2,
    nodesDraggable = true,
    nodesConnectable = false,
    elementsSelectable = true,
    deleteKeyCode = 'Delete',
    selectedNodeId,
    onSelectionChange,
    onPaneDoubleClick,
    onInit,
    onNodeDoubleClick,
    onNodeClick,
    onNodeContextMenu,
    onNodeDragStop,
    onNodeMouseEnter,
    onNodeMouseLeave,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    dimmedNodeIds,
    dimmedEdgeIds,
    isStreaming,
    background = 'dots',
    disableMiniMap = false,
    searchMatchNodeIds,
  } = props

  // 1. Run the structural layout on changes to *structure*. The
  // `structureKey` is a cheap JSON fingerprint of the tree
  // topology + content type — re-running the layout on every
  // dim/streaming toggle would be wasteful.
  const structureKey = useMemo(
    () => structuralFingerprint(rawNodes as ReadonlyArray<ShapeFlowNode>, rawEdges),
    [rawNodes, rawEdges],
  )

  const layoutResult = useMemo(
    () => applyDagreLayout(rawNodes as ReadonlyArray<ShapeFlowNode>, rawEdges, layout),
    [rawNodes, rawEdges, layout],
  )

  // 2. Apply decorations cheaply on every parent toggle.
  const decoratedNodes = useDecoratedNodes(layoutResult.nodes, {
    dimmedIds: dimmedNodeIds,
    isStreaming,
    searchMatchIds: searchMatchNodeIds,
  })
  const decoratedEdges = useDecoratedEdges(layoutResult.edges, dimmedEdgeIds)

  // 3. Local React state mirrors the parent-provided lists so
  // user interactions (drag / select) survive the next structural
  // remount. We seed the state from the first `layoutResult` and
  // re-sync on every structure change so dragging-and-releasing
  // survives the next parent update.
  //
  // CRITICAL: the two sync effects below must NOT clobber a
  // position the user just dragged. Effect 1 is allowed to reset
  // positions when the *structure* changes (the dagre pass has to
  // re-place everything). Effect 2 — decoration sync — must
  // preserve whatever position the current `nodes` state carries
  // (i.e. whatever the user just dragged), and only patch the
  // `data` field for the decoration flags. A previous revision
  // did `setNodes(decoratedNodes)` directly, which reset the
  // dragged position back to the dagre-computed one on every
  // hover/streaming toggle and effectively killed drag-to-move.
  const initialPositionsRef = useRef<ReadonlyArray<ShapeFlowNode>>(layoutResult.nodes)
  const [nodes, setNodes] = useState<ShapeFlowNode[]>(layoutResult.nodes)
  const [edges, setEdges] = useState(layoutResult.edges)

  useEffect(() => {
    initialPositionsRef.current = layoutResult.nodes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes(layoutResult.nodes)
    setEdges(layoutResult.edges)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey])

  useEffect(() => {
    // Decoration sync. The `decoratedNodes` array only changes
    // the `data` field of each node (dim / streaming / search
    // match), but the embedded `position` is the *initial* dagre
    // value. If we naively did `setNodes(decoratedNodes)` we'd
    // clobber any position the user just dragged to — that was
    // the previous bug that made the canvas feel "stuck" when
    // dragging. `mergeDecoratedNodes` keeps the current
    // `position` for every node and only patches `data`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes((prev) => mergeDecoratedNodes(prev, decoratedNodes))
    setEdges(decoratedEdges)
  }, [decoratedNodes, decoratedEdges])

  // 4. Imperative handle — parent drives the camera.
  const rfInstanceRef = useRef<ReactFlowInstance<ShapeFlowNode> | null>(null)
  const { fitView: rfFitView, getIntersectingNodes, zoomIn, zoomOut, setCenter, getZoom, getNode } =
    useReactFlow<ShapeFlowNode>()

  useImperativeHandle(
    ref,
    () => ({
      fitView: (options) => {
        rfInstanceRef.current?.fitView({
          padding: options?.padding ?? 0.3,
          duration: options?.duration ?? 200,
          maxZoom: options?.maxZoom,
        })
      },
      focusNode: (nodeId, options) => {
        rfFitView({
          nodes: [{ id: nodeId }],
          padding: options?.padding ?? 0.3,
          duration: options?.duration ?? 200,
          maxZoom: options?.maxZoom ?? 1.5,
        })
      },
      centerOnNode: (nodeId: string, options?: { duration?: number }) => {
        const node = getNode(nodeId)
        if (!node) return
        const cx = node.position.x + ((node.measured?.width ?? 0) / 2)
        const cy = node.position.y + ((node.measured?.height ?? 0) / 2)
        setCenter(cx, cy, {
          zoom: getZoom(),
          duration: options?.duration ?? 200,
        })
      },
      getIntersectingNodes: (nodeId) => {
        try {
          return getIntersectingNodes({ id: nodeId }) as ShapeFlowNode[]
        } catch {
          return []
        }
      },
      zoomIn: () => {
        zoomIn({ duration: 200 })
      },
      zoomOut: () => {
        zoomOut({ duration: 200 })
      },
    }),
    [rfFitView, getIntersectingNodes, zoomIn, zoomOut, setCenter, getZoom, getNode],
  )

  const handleInit = useCallback<OnInit<ShapeFlowNode>>(
    (instance) => {
      rfInstanceRef.current = instance as unknown as ReactFlowInstance<ShapeFlowNode>
      onInit?.(instance as never)
    },
    [onInit],
  )

  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const node = params.nodes[0]
      onSelectionChange?.(node ? node.id : null)
    },
    [onSelectionChange],
  )

  // Pane double-click: only fire when the target is the React Flow
  // pane (not a node). The default dblclick bubbles from any
  // descendant, so we filter via event.target. The parent decides
  // what to do — we just report.
  const handlePaneDblClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target && target.closest('.react-flow__node')) return
      onPaneDoubleClick?.()
    },
    [onPaneDoubleClick],
  )

  const onNodesChange = useCallback(
    (changes: NodeChange<ShapeFlowNode>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  )

  const backgroundVariant = resolveBackgroundVariant(background)

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onSelectionChange={handleSelectionChange}
      onNodeDoubleClick={onNodeDoubleClick as unknown as NodeMouseHandler}
      onNodeClick={onNodeClick as unknown as NodeMouseHandler}
      onNodeContextMenu={onNodeContextMenu as unknown as NodeMouseHandler}
      onNodeMouseEnter={onNodeMouseEnter as unknown as NodeMouseHandler}
      onNodeMouseLeave={onNodeMouseLeave as unknown as NodeMouseHandler}
      onEdgeMouseEnter={onEdgeMouseEnter as unknown as EdgeMouseHandler}
      onEdgeMouseLeave={onEdgeMouseLeave as unknown as EdgeMouseHandler}
      onNodeDragStop={onNodeDragStop}
      onInit={handleInit}
      onDoubleClick={handlePaneDblClick}
      nodeTypes={nodeComponents as unknown as NodeTypes}
      edgeTypes={edgeComponents as unknown as EdgeTypes}
      defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
      fitView={fitView}
      fitViewOptions={{ padding: fitViewPadding }}
      minZoom={minZoom}
      maxZoom={maxZoom}
      nodesDraggable={nodesDraggable}
      nodesConnectable={nodesConnectable}
      elementsSelectable={elementsSelectable}
      deleteKeyCode={deleteKeyCode}
      noWheelClassName="nowheel"
    >
      {backgroundVariant && (
        <Background
          variant={backgroundVariant}
          gap={background === 'grid' ? 20 : 16}
          size={1}
        />
      )}
      <Controls className="flow-controls" showInteractive />
      <FlowShellToolbar
        initialPositionsRef={initialPositionsRef}
        resetPositions={setNodes}
        fitViewPadding={fitViewPadding}
        selectedNodeId={selectedNodeId ?? null}
      />
      {!disableMiniMap && (
        <FlowMiniMap nodeColor={patternNodeColor} nodeStrokeWidth={2} />
      )}
    </ReactFlow>
  )
})

/**
 * Standalone wrapper that mounts a `ReactFlowProvider` around a
 * `CanvasLayout`. Useful for Storybook / tests that need a
 * fully-isolated canvas without the outer `FlowShell` (theme,
 * pattern, etc.).
 */
export function CanvasLayoutWithProvider(props: FlowShellProps) {
  return (
    <ReactFlowProvider>
      <CanvasLayout {...props} />
    </ReactFlowProvider>
  )
}
