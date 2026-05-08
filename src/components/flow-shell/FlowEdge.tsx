import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { memo } from 'react'

function FlowEdgeComponent(props: EdgeProps & { data?: { color?: string } }) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  const color = data?.color ?? 'var(--flow-pattern)'

  return <BaseEdge id={id} path={edgePath} style={{ stroke: color, strokeWidth: 1.5 }} />
}

export default memo(FlowEdgeComponent)
