import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

function MindMapEdgeComponent(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  return (
    <BaseEdge
      path={edgePath}
      className="!stroke-muted-foreground/30"
      style={{ stroke: 'rgba(148,163,184,0.3)', strokeWidth: 1.5 }}
    />
  )
}

export default memo(MindMapEdgeComponent)
