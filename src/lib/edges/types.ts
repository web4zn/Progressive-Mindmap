/**
 * Edge-strategy abstraction — mindmap-shell-v2 (task 2).
 *
 * A "edge strategy" is the visual variant of a connection between
 * two mindmap nodes. Like `NodeShape`, the strategy lives in a
 * registry (`./registry`) so the renderer can pick by name and
 * the AI prompt can teach the LLM the available palette.
 *
 * Three strategies ship by default:
 *  - `smoothstep` — orthogonal right-angle path (current default)
 *  - `bezier`     — smooth cubic-bezier curve
 *  - `straight`   — direct line, no curve
 *
 * Mirrors the node-shape module's conventions: pure data, no
 * React imports, registry lookups default to a safe fallback.
 */
import type { EdgeStyleName } from '../../types/mindmap'

/**
 * Visual marker drawn at the edge's end. The renderer uses this
 * to pick the right SVG marker definition.
 */
export type EdgeMarker = 'arrow' | 'dot' | 'none'

/**
 * Animation modes the strategy supports. The renderer consults
 * this when the node is in `isStreaming` state — strategies that
 * don't support animation get a static dash pattern instead of
 * the running shimmer.
 */
export type EdgeAnimationCapability = 'none' | 'flow' | 'pulse'

/**
 * Pure data input for an edge's per-instance size hint. The
 * strategy is *visual* — sizing is mostly determined by the two
 * endpoints, but we expose this so a strategy can e.g. add bend
 * padding.
 */
export interface EdgeStyleInput {
  /** Source node id. The renderer can look up its position. */
  sourceId: string
  /** Target node id. */
  targetId: string
  /** Whether the source has the streaming class on. */
  isStreaming: boolean
}

/**
 * The edge strategy contract. Like `NodeShape`, the JSX component
 * is stored as `unknown` here; task 3 narrows it where the
 * renderer needs it.
 */
export interface EdgeStrategy {
  /** Discriminator. Mirrors `EdgeStyleName`. */
  readonly name: EdgeStyleName
  /** One-line human-readable description. */
  readonly description: string
  /** Marker drawn at the end of the edge. */
  readonly defaultMarker: EdgeMarker
  /** Animation capability. */
  readonly animation: EdgeAnimationCapability
  /**
   * Whether this edge can be used for "parent → child" flow
   * arrows. All three default strategies can, but a future
   * "boundary" or "decoration" strategy might not.
   */
  readonly supportsFlow: boolean
  /**
   * The JSX component to mount for this strategy. Task 3 replaces
   * the placeholder with the real implementation.
   */
  edgeComponent: unknown
}

/**
 * Type-guard: is the given string a valid `EdgeStyleName`?
 */
export function isEdgeStyleName(value: unknown): value is EdgeStyleName {
  return value === 'smoothstep' || value === 'bezier' || value === 'straight'
}

/**
 * Resolve a possibly-undefined `EdgeStyleName` to a concrete
 * value, defaulting to `'smoothstep'` (the current visual
 * default).
 */
export function resolveEdgeStyleName(value: unknown): EdgeStyleName {
  return isEdgeStyleName(value) ? value : 'smoothstep'
}
