/**
 * StraightEdge — direct line, no curve.
 *
 * Reads as "terminal" / "leaf". Used in v2 for edges whose
 * target is a `stadium` or `circle` node where the smoothstep
 * / bezier's curves look out of place.
 */
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react'
import { memo } from 'react'

function StraightEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, markerEnd } = props
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY })

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      className="flow-edge-path flow-edge-straight"
    />
  )
}

export default memo(StraightEdgeComponent)
