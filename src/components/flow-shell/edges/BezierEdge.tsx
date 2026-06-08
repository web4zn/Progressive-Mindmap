/**
 * BezierEdge — smooth cubic-bezier curve.
 *
 * Recommended for root-node edges and any path that should
 * read as "elegant" rather than "structural". The control
 * point offset mirrors the v1 `getBezierPath` defaults.
 */
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'
import { memo } from 'react'

function BezierEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd } =
    props
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      className="flow-edge-path flow-edge-bezier"
    />
  )
}

export default memo(BezierEdgeComponent)
