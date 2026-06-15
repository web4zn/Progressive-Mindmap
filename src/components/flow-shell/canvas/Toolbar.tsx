/**
 * Toolbar — mindmap-shell-v2 (task 4).
 *
 * The small panel of buttons that floats in the top-left corner
 * of the canvas. Split out of `FlowShell` so the layout can be
 * reused (e.g. the v2 "more" menu) without re-rendering the
 * entire shell.
 *
 * Two actions today:
 *  - **Auto arrange** (↻): resets all node positions to the
 *    dagre-laid-out ones and fits the view.
 *  - **Focus** (⊕): fits the view to the currently selected
 *    node. Hidden when no node is selected.
 */
import { memo, useCallback } from 'react'
import { Panel, useReactFlow } from '@xyflow/react'
import { ArrowLeft } from 'lucide-react'
import type { ShapeFlowNode } from './flowShellUtils'

export interface FlowShellToolbarProps {
  /** Initial layout positions to restore on "auto arrange". */
  initialPositionsRef: React.MutableRefObject<ReadonlyArray<ShapeFlowNode>>
  /** Re-apply positions to a state-setter. Caller owns the
   *  React state — we just call this with the reset values. */
  resetPositions: (next: ShapeFlowNode[]) => void
  /** Padding used by `fitView`. */
  fitViewPadding: number
  /** Currently selected node id, or `null` for "no selection". */
  selectedNodeId: string | null
  /** node-llm-chat: when true, show a "back to global" button. */
  showBackToGlobal?: boolean
  /** node-llm-chat: called when the "back to global" button is clicked. */
  onBackToGlobal?: () => void
}

function FlowShellToolbarImpl({
  initialPositionsRef,
  resetPositions,
  fitViewPadding,
  selectedNodeId,
  showBackToGlobal,
  onBackToGlobal,
}: FlowShellToolbarProps) {
  const { fitView, getNodes } = useReactFlow<ShapeFlowNode>()

  const handleAutoArrange = useCallback(() => {
    // Restore the canonical dagre positions, then re-fit the view
    // on the next tick so React Flow has time to apply the new
    // positions to the DOM before the camera moves.
    resetPositions([...initialPositionsRef.current] as ShapeFlowNode[])
    // We read positions from the rf instance directly because
    // `initialPositionsRef` may have been computed against a
    // pre-decoration list.
    const live = getNodes()
    if (live.length > 0) {
      resetPositions(live as ShapeFlowNode[])
    }
    setTimeout(() => {
      fitView({ padding: fitViewPadding, duration: 200 })
    }, 50)
  }, [fitView, fitViewPadding, getNodes, initialPositionsRef, resetPositions])

  const handleFocus = useCallback(() => {
    if (!selectedNodeId) return
    fitView({
      nodes: [{ id: selectedNodeId }],
      padding: 0.3,
      duration: 200,
      maxZoom: 1.5,
    })
  }, [selectedNodeId, fitView])

  return (
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
        {showBackToGlobal && (
          <button
            type="button"
            onClick={onBackToGlobal}
            className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer whitespace-nowrap"
            title="回到全局对话"
            aria-label="回到全局对话"
          >
            <ArrowLeft className="w-3 h-3" />
            全局
          </button>
        )}
      </div>
    </Panel>
  )
}

export const FlowShellToolbar = memo(FlowShellToolbarImpl)
