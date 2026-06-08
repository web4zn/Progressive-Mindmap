/**
 * Edge-strategy components — mindmap-shell-v2 (task 3).
 *
 * Mirrors `nodes/index.ts`: registers the three JSX edge
 * components (Smoothstep / Bezier / Straight) into the edge
 * registry, and re-exports an `edgeComponents` map for
 * `FlowShell` to plug into React Flow's `edgeTypes` prop.
 */
import { registerEdgeStrategy, getEdgeStrategy } from '@/lib/edges/registry'
import type { EdgeStyleName } from '@/types/mindmap'
import type { EdgeProps } from '@xyflow/react'

import SmoothstepEdge from './SmoothstepEdge'
import BezierEdge from './BezierEdge'
import StraightEdge from './StraightEdge'

export const edgeComponents = {
  smoothstep: SmoothstepEdge,
  bezier: BezierEdge,
  straight: StraightEdge,
} as const satisfies Record<EdgeStyleName, React.ComponentType<EdgeProps>>

for (const [name, component] of Object.entries(edgeComponents)) {
  const existing = getEdgeStrategy(name)
  registerEdgeStrategy({
    ...existing,
    name: name as EdgeStyleName,
    edgeComponent: component,
  })
}

const _exhaustive: Record<EdgeStyleName, React.ComponentType<EdgeProps>> = edgeComponents
void _exhaustive
