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
  Panel,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type ReactFlowInstance,
  type NodeMouseHandler,
  type OnNodeDrag,
  type OnSelectionChangeParams,
  type EdgeMouseHandler,
  type BackgroundVariant,
  type OnInit,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import './flow-shell.css'
import FlowNodeComponent from './FlowNode'
import type { FlowNodeData } from './index'
import { computeNodeSize, type NodeSize } from '@/lib/mindmap-flow'
import FlowMiniMap from './MiniMap'

/** Stage D — the four mindmap patterns the user can pick from
 *  the header dropdown. Mirrors the `MindMapPattern` type in
 *  `MindMapHeader.tsx` (kept narrow on purpose — unknown strings
 *  fall back to `'auto'`). */
export type FlowShellPattern = 'auto' | '5w1h' | 'tech' | 'pros-cons'

const PATTERN_COLORS: Record<FlowShellPattern, string> = {
  auto: '#3b82f6',
  '5w1h': '#22c55e',
  tech: '#8b5cf6',
  'pros-cons': '#f59e0b',
}

const DEFAULT_TEXT_SIZE: NodeSize = { width: 200, height: 100 }
const EXPANDED_HTML_HEIGHT = 380

function applyLayout(
  flowNodes: Node<FlowNodeData, 'flow'>[],
  flowEdges: Edge[],
  direction: string,
): { nodes: Node<FlowNodeData, 'flow'>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction === 'dagre-tb' ? 'TB' : 'LR',
    nodesep: 50,
    ranksep: 160,
    edgesep: 40,
    marginx: 60,
    marginy: 60,
  })

  const sizes = new Map<string, NodeSize>()
  for (const n of flowNodes) {
    const hasRichContent = n.data?.contentType === 'html' && !!n.data?.content
    const isExpanded = n.data?.expanded === true
    const computed = computeNodeSize({
      label: n.data?.label ?? '',
      summary: n.data?.summary ?? '',
      contentLength: n.data?.content?.length,
      hasHtml: hasRichContent,
      hasChildren: !!n.data?.hasChildren,
    })
    const size: NodeSize = hasRichContent
      ? {
          width: computed.width,
          height: isExpanded
            ? EXPANDED_HTML_HEIGHT
            : Math.min(EXPANDED_HTML_HEIGHT, Math.max(computed.height, 140)),
        }
      : computed
    sizes.set(n.id, size)
    g.setNode(n.id, { width: size.width, height: size.height })
  }
  for (const e of flowEdges) {
    g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  const layoutedNodes = flowNodes.map((n) => {
    const pos = g.node(n.id)
    if (!pos) return n
    const size = sizes.get(n.id) ?? DEFAULT_TEXT_SIZE
    return {
      ...n,
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
      width: size.width,
      height: size.height,
    }
  })

  return { nodes: layoutedNodes, edges: flowEdges }
}

export interface FlowShellProps {
  nodes: Node<FlowNodeData, 'flow'>[]
  edges: Edge[]
  /**
   * Stage D — pattern prop. Drives the wrapper's `data-pattern`
   * attribute, which `css/theme.css` reads to set `--flow-pattern`
   * for edges / handles / accents. Defaults to `'auto'`.
   */
  pattern?: FlowShellPattern
  /**
   * Theme override. When omitted, the shell follows
   * `document.documentElement.dataset.theme` (set by the
   * `useTheme` hook in `MindMapPanel`) so a global theme toggle
   * cascades without prop-drilling.
   */
  theme?: 'dark' | 'light'
  layout?: 'dagre-lr' | 'dagre-tb'
  fitView?: boolean
  fitViewPadding?: number
  minZoom?: number
  maxZoom?: number
  nodesDraggable?: boolean
  nodesConnectable?: boolean
  elementsSelectable?: boolean
  deleteKeyCode?: string
  selectedNodeId?: string | null
  onSelectionChange?: (nodeId: string | null) => void
  /**
   * Invoked when the user double-clicks on an empty area of the pane
   * (i.e. NOT on a node). The parent is expected to also call
   * `flowShellRef.current?.fitView()` from this handler — `FlowShell`
   * intentionally does not call fitView itself so the parent can layer
   * side-effects (e.g. close any in-place expansion) on top.
   */
  onPaneDoubleClick?: () => void
  onInit?: OnInit<Node<FlowNodeData, 'flow'>, Edge>
  onNodeDoubleClick?: NodeMouseHandler<Node>
  onNodeContextMenu?: NodeMouseHandler<Node>
  onNodeDragStop?: OnNodeDrag<Node>
  /**
   * Stage A2 — hover callback for path highlight. Parent tracks
   * `hoveredNodeId` and computes the ancestor chain to decide which
   * nodes/edges to dim. We pass this through instead of doing the
   * highlight in-shell so the chain logic lives next to the tree
   * (where `findAncestorChain` already is).
   */
  onNodeMouseEnter?: NodeMouseHandler<Node>
  onNodeMouseLeave?: NodeMouseHandler<Node>
  /** Stage C — edge hover callback for path highlight. Fires when the
   *  user moves the pointer over a React Flow edge path. */
  onEdgeMouseEnter?: EdgeMouseHandler<Edge>
  onEdgeMouseLeave?: EdgeMouseHandler<Edge>
  /** Stage A2 — applied as `.flow-node.dimmed` on every node in the set. */
  dimmedNodeIds?: ReadonlySet<string>
  /** Stage A2 — applied as `.react-flow__edge.dimmed` on every edge whose
   *  source AND target are in the dim set, so the user sees the path
   *  between highlighted nodes as 100% opaque. */
  dimmedEdgeIds?: ReadonlySet<string>
  /** Stage A2 — when true, every node with `depth < 3` gets the
   *  `.flow-node.streaming` class so the shimmer animation runs. */
  isStreaming?: boolean
  /** Stage C — variant of the canvas background. Defaults to 'dots'. */
  background?: 'dots' | 'grid' | 'none'
  /** Stage C — disable the custom MiniMap (used by Storybook / tests). */
  disableMiniMap?: boolean
  /** Stage C — node ids that should receive the `.flow-node.search-match`
   *  highlight (search box drives this). */
  searchMatchNodeIds?: ReadonlySet<string>
}

export interface FlowShellHandle {
  /** Fit the entire flow in view (used by the toolbar ↻ button and by the
   *  parent's pane-double-click handler). */
  fitView: (options?: { padding?: number; duration?: number; maxZoom?: number }) => void
  /** Fit a single node in view (used by the toolbar focus button and
   *  potentially by the parent for "center on node" actions). */
  focusNode: (
    nodeId: string,
    options?: { padding?: number; duration?: number; maxZoom?: number },
  ) => void
  /**
   * Stage A2 — returns the nodes that currently intersect the dragged
   * node's bounding box. The drag-reparent logic in MindMapTree uses
   * this in `onNodeDragStop` instead of hand-rolled `getBoundingClientRect`
   * arithmetic. Exposed via the imperative handle because the React Flow
   * instance (and therefore `useReactFlow().getIntersectingNodes`) only
   * exists inside this provider.
   */
  getIntersectingNodes: (nodeId: string) => Node<FlowNodeData, 'flow'>[]
  /** Stage A2 — programmatic zoom in / out (used by `+` / `-` hotkeys). */
  zoomIn: () => void
  zoomOut: () => void
}

const _nodeTypes = { flow: FlowNodeComponent }

/**
 * Stage D — narrowing helper. Used by the MiniMap `nodeColor` prop
 * so the function body doesn't have to hand-roll an `as` cast.
 */
function getNodePatternColor(node: Node<FlowNodeData, 'flow'> | Node): string {
  const data = node.data as FlowNodeData | undefined
  const pattern = (data?.pattern ?? 'auto') as FlowShellPattern
  return PATTERN_COLORS[pattern] ?? PATTERN_COLORS.auto
}

/**
 * Inner shell — must live inside a ReactFlowProvider so `useReactFlow()` is
 * available. Wraps the visible canvas + panel toolbar (focus / arrange).
 * Exposes `FlowShellHandle` via `forwardRef` so the parent can drive
 * `fitView` / `focusNode` from outside the provider context.
 */
const FlowShellInner = forwardRef<FlowShellHandle, FlowShellProps>(function FlowShellInner(
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

  const structureKey = useMemo(
    () =>
      JSON.stringify({
        n: rawNodes.map((n) => ({
          id: n.id,
          ct: n.data?.contentType,
          hasContent: !!n.data?.content,
          exp: n.data?.expanded === true,
        })),
        e: rawEdges.map((e) => `${e.source}→${e.target}`),
      }),
    [rawNodes, rawEdges],
  )

  const layoutResult = useMemo(
    () => applyLayout(rawNodes, rawEdges, layout),
    [rawNodes, rawEdges, layout],
  )

  // Stage A2: apply dimmed + streaming flags through `data` so FlowNode
  // composes its own class list (the `.flow-node` div is rendered by
  // FlowNode, not the React Flow wrapper). For edges we own the
  // `className` directly because BaseEdge forwards it to the path.
  // Stage C: also propagate the search-match highlight via data so
  // FlowNode can render the outline without React Flow needing to know
  // about it.
  const decoratedNodes = useMemo<Node<FlowNodeData, 'flow'>[]>(() => {
    return layoutResult.nodes.map((n) => {
      const isDimmed = !!dimmedNodeIds && dimmedNodeIds.has(n.id)
      const isSearchMatch = !!searchMatchNodeIds && searchMatchNodeIds.has(n.id)
      const depth = n.data?.depth ?? 0
      const showStreaming = !!isStreaming && depth < 3
      const data = n.data
      if (
        data?.isDimmed === isDimmed &&
        data?.isStreaming === showStreaming &&
        data?.isSearchMatch === isSearchMatch
      ) {
        return n
      }
      return {
        ...n,
        data: {
          ...(data ?? ({} as FlowNodeData)),
          isDimmed,
          isStreaming: showStreaming,
          isSearchMatch,
        },
      }
    })
  }, [layoutResult.nodes, dimmedNodeIds, isStreaming, searchMatchNodeIds])

  const decoratedEdges = useMemo<Edge[]>(() => {
    if (!dimmedEdgeIds || dimmedEdgeIds.size === 0) return layoutResult.edges
    return layoutResult.edges.map((e) => {
      if (dimmedEdgeIds.has(e.id)) {
        return { ...e, className: `${e.className ?? ''} dimmed`.trim() }
      }
      return e
    })
  }, [layoutResult.edges, dimmedEdgeIds])

  const initialPositionsRef = useRef<Node<FlowNodeData, 'flow'>[]>(layoutResult.nodes)

  const [nodes, setNodes] = useState<Node<FlowNodeData, 'flow'>[]>(layoutResult.nodes)
  const [edges, setEdges] = useState<Edge[]>(layoutResult.edges)

  useEffect(() => {
    initialPositionsRef.current = layoutResult.nodes
    setNodes(layoutResult.nodes)
    setEdges(layoutResult.edges)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey])

  // Stage A2: sync dim/stream classes whenever the parent toggles them.
  // The structural layout above is keyed by `structureKey`; this effect
  // is intentionally cheap (just className strings) and runs on every
  // hover / streaming change.
  useEffect(() => {
    setNodes(decoratedNodes)
    setEdges(decoratedEdges)
  }, [decoratedNodes, decoratedEdges])

  const rfInstanceRef = useRef<ReactFlowInstance<Node<FlowNodeData, 'flow'>, Edge> | null>(null)
  const { fitView: rfFitView, getIntersectingNodes: rfGetIntersectingNodes, zoomIn: rfZoomIn, zoomOut: rfZoomOut } =
    useReactFlow<Node<FlowNodeData, 'flow'>, Edge>()

  // Expose imperative handle for the parent. `useReactFlow` is the documented
  // way to call fitView from outside the provider context, so the parent
  // can drive the camera without us re-creating the wrapper here.
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
      getIntersectingNodes: (nodeId) => {
        try {
          // `useReactFlow().getIntersectingNodes` returns the generic
          // `Node[]`. The `FlowShellHandle` contract is the narrower
          // `Node<FlowNodeData, 'flow'>[]`; the cast is safe because
          // `rfInstanceRef.current` was constructed from the same
          // narrowed `nodes` we passed to `<ReactFlow>`.
          return rfGetIntersectingNodes({ id: nodeId }) as Node<FlowNodeData, 'flow'>[]
        } catch {
          return []
        }
      },
      zoomIn: () => {
        rfZoomIn({ duration: 200 })
      },
      zoomOut: () => {
        rfZoomOut({ duration: 200 })
      },
    }),
    [rfFitView, rfGetIntersectingNodes, rfZoomIn, rfZoomOut],
  )

  const handleAutoArrange = useCallback(() => {
    setNodes([...initialPositionsRef.current])
    setTimeout(() => {
      rfInstanceRef.current?.fitView({ padding: fitViewPadding, duration: 200 })
    }, 50)
  }, [fitViewPadding])

  const handleFocus = useCallback(() => {
    if (!selectedNodeId) return
    rfFitView({
      nodes: [{ id: selectedNodeId }],
      padding: 0.3,
      duration: 200,
      maxZoom: 1.5,
    })
  }, [selectedNodeId, rfFitView])

  const handleInit = useCallback<OnInit<Node<FlowNodeData, 'flow'>, Edge>>(
    (instance) => {
      rfInstanceRef.current = instance
      onInit?.(instance)
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

  // Pane double-click: only fire when the target is the React Flow pane (not
  // a node). The default dblclick bubbles from any descendant, so we
  // manually filter via event.target. We intentionally do NOT call
  // `rfFitView()` here — the parent is in charge of "what does pane-dblclick
  // mean" so it can layer side-effects (close any in-place expansion, etc.)
  // before/after fitting the view.
  const handlePaneDblClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target && target.closest('.react-flow__node')) return
      onPaneDoubleClick?.()
    },
    [onPaneDoubleClick],
  )

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<FlowNodeData, 'flow'>>[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  )

  // Stage D — narrow the literal to a BackgroundVariant. The xyflow
  // type is an enum (not a string union), so the cast is unavoidable.
  // We keep the local variable so the cast sits in one place.
  const backgroundVariant: BackgroundVariant =
    background === 'grid' ? ('lines' as BackgroundVariant) : ('dots' as BackgroundVariant)

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onSelectionChange={handleSelectionChange}
      onNodeDoubleClick={onNodeDoubleClick}
      onNodeContextMenu={onNodeContextMenu}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      onEdgeMouseEnter={onEdgeMouseEnter}
      onEdgeMouseLeave={onEdgeMouseLeave}
      onNodeDragStop={onNodeDragStop}
      onInit={handleInit}
      onDoubleClick={handlePaneDblClick}
      nodeTypes={_nodeTypes}
      defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: 'var(--flow-pattern)', strokeWidth: 1.5 } }}
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
      {background !== 'none' && (
        <Background
          variant={backgroundVariant}
          gap={background === 'grid' ? 20 : 16}
          size={background === 'grid' ? 1 : 1}
        />
      )}
      <Controls className="flow-controls" showInteractive />
      <Panel position="top-left">
        <div className="flow-shell-toolbar">
          <button
            className="flow-shell-arrange-btn"
            onClick={handleAutoArrange}
            title="自动整理"
            aria-label="自动整理"
          >
            ↻
          </button>
          {selectedNodeId && (
            <button
              className="flow-shell-focus-btn"
              onClick={handleFocus}
              title="聚焦到选中节点"
              aria-label="聚焦到选中节点"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
                <path d="M11 8v6" />
                <path d="M8 11h6" />
              </svg>
            </button>
          )}
        </div>
      </Panel>
      {!disableMiniMap && (
        <FlowMiniMap
          nodeColor={getNodePatternColor}
          nodeStrokeWidth={2}
        />
      )}
    </ReactFlow>
  )
})

/**
 * Stage D — read the current global theme from
 * `document.documentElement.dataset.theme`. Falls back to `'light'`
 * if the dataset hasn't been set yet (e.g. in tests).
 */
function readDocumentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  const raw = document.documentElement.dataset['theme']
  return raw === 'dark' ? 'dark' : 'light'
}

export default forwardRef<FlowShellHandle, FlowShellProps>(function FlowShell(props, ref) {
  // The `data-theme` attribute is set from the prop when provided,
  // otherwise it follows the global `useTheme` state via the
  // `dataset.theme` attribute (kept in sync by `applyTheme`).
  const themeAttr = props.theme ?? readDocumentTheme()
  return (
    <div
      className="flow-shell"
      data-theme={themeAttr}
      data-pattern={props.pattern ?? 'auto'}
      style={{ width: '100%', height: '100%' }}
    >
      <ReactFlowProvider>
        <FlowShellInner {...props} ref={ref} />
      </ReactFlowProvider>
    </div>
  )
})
