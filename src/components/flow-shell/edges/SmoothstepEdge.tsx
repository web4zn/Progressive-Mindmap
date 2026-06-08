/**
 * SmoothstepEdge — orthogonal right-angle path.
 *
 * The v1 default. Carried over unchanged for visual backwards
 * compatibility. CSS lives in `edge.css` and the path
 * picks up the `flow-edge-path` class so the Stage A2 dim
 * animation works.
 */
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { memo } from 'react'

function SmoothstepEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd } =
    props
  const [edgePath] = getSmoothStepPath({
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
      className="flow-edge-path flow-edge-smoothstep"
    />
  )
}

export default memo(SmoothstepEdgeComponent)
