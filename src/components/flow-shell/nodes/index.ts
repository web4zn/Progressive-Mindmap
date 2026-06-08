/**
 * Node-shape components — mindmap-shell-v2 (task 3).
 *
 * The mindmap v2 ships a single node presentation (the rect card).
 * Earlier revisions exported four siblings
 * (Rect / Chip / Circle / Stadium) for a user-facing "switch shape"
 * menu; the menu was dropped during the v2 cleanup because the
 * non-rect variants hid body content and made the canvas hard to
 * read. The shape registry still exists so future presentations
 * can be added without rewriting the renderer — but the only
 * registered shape today is `rect`.
 *
 * What this file still does:
 *  1. Registers the rect JSX component into the shape registry.
 *  2. Re-exports a `nodeComponents` map for `FlowShell` to plug
 *     into React Flow's `nodeTypes` prop.
 */
import { registerNodeShape, getNodeShape } from '@/lib/shapes/registry'
import type { NodeShapeName } from '@/types/mindmap'
import type { NodeProps } from '@xyflow/react'

import RectCardNode from './RectCardNode'

/**
 * Map of shape-name → React component. Used by `FlowShell` to
 * build React Flow's `nodeTypes` prop. The map is keyed by the
 * shape name (the same key the renderer uses for its own
 * `nodeTypes`), which lets the renderer route a node to the
 * correct component in O(1).
 */
export const nodeComponents = {
  rect: RectCardNode,
} as const satisfies Record<NodeShapeName, React.ComponentType<NodeProps>>

/**
 * Side-effect import: registering the component wires the
 * placeholder default in `@/lib/shapes/registry` to the real JSX.
 * Any code that does `getNodeShape(name).nodeComponent` now gets
 * a real React component.
 */
for (const [name, component] of Object.entries(nodeComponents)) {
  const existing = getNodeShape(name)
  registerNodeShape({
    ...existing,
    name: name as NodeShapeName,
    nodeComponent: component,
  })
}

/**
 * Sanity check: this is a no-op expression that the TS compiler
 * will reject if a key of `nodeComponents` is missing from
 * `NodeShapeName` (or vice versa). We want the compiler to fail
 * loudly when a new shape is added in one place but not the
 * other.
 */
const _exhaustive: Record<NodeShapeName, React.ComponentType<NodeProps>> = nodeComponents
void _exhaustive
