/**
 * FlowShell — mindmap-shell-v2 (task 4).
 *
 * Outer shell — wraps the React Flow provider with the theme
 * and pattern attributes, and exposes the imperative handle to
 * the parent. The actual canvas (dagre layout, decorations,
 * toolbar, MiniMap) lives in `canvas/CanvasLayout.tsx`.
 *
 * The split keeps this file under 200 lines so the theme and
 * pattern decisions are easy to read in isolation.
 */
import { forwardRef } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { CanvasLayout } from './canvas/CanvasLayout'

/** Pattern names. Mirrors `MindMapHeader`'s union. */
export type FlowShellPattern = 'auto' | '5w1h' | 'tech' | 'pros-cons'

export interface FlowShellProps {
  nodes: ReadonlyArray<import('@xyflow/react').Node<import('./index').FlowNodeData, string>>
  edges: ReadonlyArray<import('@xyflow/react').Edge>
  pattern?: FlowShellPattern
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
  onPaneDoubleClick?: () => void
  onInit?: import('@xyflow/react').OnInit<
    import('@xyflow/react').Node<import('./index').FlowNodeData, string>,
    import('@xyflow/react').Edge
  >
  onNodeDoubleClick?: import('@xyflow/react').NodeMouseHandler
  onNodeClick?: import('@xyflow/react').NodeMouseHandler
  onNodeContextMenu?: import('@xyflow/react').NodeMouseHandler
  onNodeDragStop?: import('@xyflow/react').OnNodeDrag
  onNodeMouseEnter?: import('@xyflow/react').NodeMouseHandler
  onNodeMouseLeave?: import('@xyflow/react').NodeMouseHandler
  onEdgeMouseEnter?: import('@xyflow/react').EdgeMouseHandler
  onEdgeMouseLeave?: import('@xyflow/react').EdgeMouseHandler
  dimmedNodeIds?: ReadonlySet<string>
  dimmedEdgeIds?: ReadonlySet<string>
  isStreaming?: boolean
  background?: 'dots' | 'grid' | 'none'
  disableMiniMap?: boolean
  searchMatchNodeIds?: ReadonlySet<string>
}

export interface FlowShellHandle {
  fitView: (options?: { padding?: number; duration?: number; maxZoom?: number }) => void
  focusNode: (
    nodeId: string,
    options?: { padding?: number; duration?: number; maxZoom?: number },
  ) => void
  getIntersectingNodes: (
    nodeId: string,
  ) => import('@xyflow/react').Node<import('./index').FlowNodeData, string>[]
  zoomIn: () => void
  zoomOut: () => void
  centerOnNode: (
    nodeId: string,
    options?: { duration?: number },
  ) => void
}

function readDocumentTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  const raw = document.documentElement.dataset['theme']
  return raw === 'dark' ? 'dark' : 'light'
}

export default forwardRef<FlowShellHandle, FlowShellProps>(function FlowShell(props, ref) {
  const themeAttr = props.theme ?? readDocumentTheme()
  return (
    <div
      className="flow-shell"
      data-theme={themeAttr}
      data-pattern={props.pattern ?? 'auto'}
      style={{ width: '100%', height: '100%' }}
    >
      <ReactFlowProvider>
        <CanvasLayout {...props} ref={ref} />
      </ReactFlowProvider>
    </div>
  )
})
