import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type ReactFlowInstance,
  type NodeMouseHandler,
  type OnNodeDrag,
  type BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import './flow-shell.css'
import FlowNodeComponent from './FlowNode'
import type { FlowNodeData } from './index'

const NODE_WIDTH = 200
const NODE_HEIGHT = 100
const RICH_NODE_HEIGHT = 380

const _nodeTypes = { flow: FlowNodeComponent }

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
  onInit?: (instance: ReactFlowInstance) => void
  onNodeDoubleClick?: NodeMouseHandler<Node>
  onNodeContextMenu?: NodeMouseHandler<Node>
  onNodeDragStop?: OnNodeDrag<Node>
}

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

  for (const n of flowNodes) {
    const hasRichContent = n.data?.contentType === 'html' && n.data?.content
    g.setNode(n.id, {
      width: NODE_WIDTH,
      height: hasRichContent ? RICH_NODE_HEIGHT : NODE_HEIGHT,
    })
  }
  for (const e of flowEdges) {
    g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  const layoutedNodes = flowNodes.map((n) => {
    const pos = g.node(n.id)
    if (!pos) return n
    const hasRich = n.data?.contentType === 'html' && n.data?.content
    const nodeH = hasRich ? RICH_NODE_HEIGHT : NODE_HEIGHT
    return {
      ...n,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - nodeH / 2 },
    }
  })

  return { nodes: layoutedNodes, edges: flowEdges }
}

export default function FlowShell(props: FlowShellProps) {
  const {
    nodes: rawNodes,
    edges: rawEdges,
    theme = 'light',
    layout = 'dagre-lr',
    fitView = true,
    fitViewPadding = 0.3,
    minZoom = 0.1,
    maxZoom = 2,
    nodesDraggable = true,
    nodesConnectable = false,
    elementsSelectable = true,
    deleteKeyCode = 'Delete',
    onInit,
    onNodeDoubleClick,
    onNodeContextMenu,
    onNodeDragStop,
  } = props

  // Stable key: changes when node IDs, edge connections, or content data differ
  const structureKey = useMemo(
    () =>
      JSON.stringify({
        n: rawNodes.map((n) => ({
          id: n.id,
          ct: n.data?.contentType,
          hasContent: !!n.data?.content,
        })),
        e: rawEdges.map((e) => `${e.source}→${e.target}`),
      }),
    [rawNodes, rawEdges],
  )

  // Layout: dagre runs when structure, content type, or direction changes
  const layoutResult = useMemo(
    () => applyLayout(rawNodes, rawEdges, layout),
    [rawNodes, rawEdges, layout],
  )

  const initialPositionsRef = useRef(layoutResult.nodes as Node[])

  const [nodes, setNodes] = useState<Node[]>(layoutResult.nodes as Node[])
  const [edges, setEdges] = useState<Edge[]>(layoutResult.edges as Edge[])

  // Tree structure changed → save new layout + reset
  useEffect(() => {
    initialPositionsRef.current = layoutResult.nodes as Node[]
    /* eslint-disable react-hooks/set-state-in-effect */
    setNodes(layoutResult.nodes as Node[])
    setEdges(layoutResult.edges as Edge[])
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey])

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)

  // ↻ button: restore saved positions + re-center viewport
  const handleAutoArrange = useCallback(() => {
    setNodes([...initialPositionsRef.current])
    setTimeout(() => {
      rfInstanceRef.current?.fitView({ padding: fitViewPadding, duration: 200 })
    }, 50)
  }, [fitViewPadding])

  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      rfInstanceRef.current = instance
      onInit?.(instance)
    },
    [onInit],
  )
  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => setNodes((nds) => applyNodeChanges(changes, nds) as Node[]),
    [],
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds) as Edge[]),
    [],
  )

  const nodeColorFn = useCallback((node: Node) => {
    const data = node.data as FlowNodeData | undefined
    const pattern = data?.pattern ?? 'auto'
    const colors: Record<string, string> = {
      auto: '#3b82f6',
      '5w1h': '#22c55e',
      tech: '#8b5cf6',
      'pros-cons': '#f59e0b',
    }
    return colors[pattern] ?? colors.auto!
  }, [])

  return (
    <div className="flow-shell" data-theme={theme} data-pattern="auto" style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStop={onNodeDragStop}
        onInit={handleInit}
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
          <button className="flow-shell-arrange-btn" onClick={handleAutoArrange} title="自动整理">
            ↻
          </button>
        </Panel>
        <MiniMap
          className="flow-minimap"
          nodeColor={nodeColorFn}
          nodeStrokeWidth={2}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  )
}
