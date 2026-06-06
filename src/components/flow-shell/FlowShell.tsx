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
  MiniMap,
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
  type BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import './flow-shell.css'
import FlowNodeComponent from './FlowNode'
import type { FlowNodeData } from './index'
import { computeNodeSize, type NodeSize } from '@/lib/mindmap-flow'

const DEFAULT_TEXT_SIZE: NodeSize = { width: 200, height: 100 }
const EXPANDED_HTML_HEIGHT = 380

function applyLayout(
  flowNodes: Node<FlowNodeData>[],
  flowEdges: Edge[],
  direction: string,
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
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
  onInit?: (instance: ReactFlowInstance) => void
  onNodeDoubleClick?: NodeMouseHandler<Node>
  onNodeContextMenu?: NodeMouseHandler<Node>
  onNodeDragStop?: OnNodeDrag<Node>
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
}

const _nodeTypes = { flow: FlowNodeComponent }

const nodeColorFn = (node: Node) => {
  const data = node.data as FlowNodeData | undefined
  const pattern = data?.pattern ?? 'auto'
  const colors: Record<string, string> = {
    auto: '#3b82f6',
    '5w1h': '#22c55e',
    tech: '#8b5cf6',
    'pros-cons': '#f59e0b',
  }
  return colors[pattern] ?? colors.auto!
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

  const initialPositionsRef = useRef(layoutResult.nodes as Node[])

  const [nodes, setNodes] = useState<Node[]>(layoutResult.nodes as Node[])
  const [edges, setEdges] = useState<Edge[]>(layoutResult.edges as Edge[])

  useEffect(() => {
    initialPositionsRef.current = layoutResult.nodes as Node[]
    setNodes(layoutResult.nodes as Node[])
    setEdges(layoutResult.edges as Edge[])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey])

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)
  const { fitView: rfFitView } = useReactFlow()

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
    }),
    [rfFitView],
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

  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
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
    (changes: NodeChange<Node>[]) => setNodes((nds) => applyNodeChanges(changes, nds) as Node[]),
    [],
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds) as Edge[]),
    [],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onSelectionChange={handleSelectionChange}
      onNodeDoubleClick={onNodeDoubleClick}
      onNodeContextMenu={onNodeContextMenu}
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
      <Background variant={'dots' as BackgroundVariant} gap={16} size={1} />
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
      <MiniMap
        className="flow-minimap"
        nodeColor={nodeColorFn}
        nodeStrokeWidth={2}
        pannable
        zoomable
      />
    </ReactFlow>
  )
})

export default forwardRef<FlowShellHandle, FlowShellProps>(function FlowShell(props, ref) {
  return (
    <div
      className="flow-shell"
      data-theme={props.theme ?? 'light'}
      data-pattern="auto"
      style={{ width: '100%', height: '100%' }}
    >
      <ReactFlowProvider>
        <FlowShellInner {...props} ref={ref} />
      </ReactFlowProvider>
    </div>
  )
})
