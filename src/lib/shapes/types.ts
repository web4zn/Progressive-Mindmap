/**
 * Node-shape abstraction.
 *
 * The mindmap v2 ships a single node presentation (the rect card).
 * Earlier revisions had three sibling shapes (chip / circle /
 * stadium) for a user-facing "switch shape" menu; the menu was
 * dropped during the v2 cleanup because the non-rect variants hid
 * body content. The shape registry still exists so a future
 * variant can be added without rewriting the renderer.
 *
 * Why a registry instead of a `switch` in the renderer? Three reasons:
 *
 *  1. **Open for extension.** New shapes can be added by registering
 *     one more entry — no renderer change.
 *  2. **Testable in isolation.** A shape is a pure-data object with
 *     a few well-typed callbacks; the registry is a `Map` we can
 *     assert against.
 *  3. **Tree-shakeable.** Tasks that only need the registry API
 *     can import it without dragging in JSX.
 *
 * Important: this file is pure data + tiny types. It must NOT import
 * React or any UI code. The actual JSX lives in
 * `src/components/flow-shell/nodes/*` and is plugged in via the
 * `nodeComponent` field on each `NodeShape`.
 */
import type { NodeShapeName } from '../../types/mindmap'

/**
 * Handle attachment positions. The renderer uses these to place
 * React Flow `<Handle>` elements along the node's perimeter.
 *
 * `auto` lets the shape decide. For the initial shape we only use
 * `left` / `right` (LR dagre layout); the union is left wider for
 * future layouts (e.g. TB).
 */
export type HandlePosition = 'left' | 'right' | 'top' | 'bottom' | 'auto'

/**
 * The dagre-friendly size hint for a node. The shape's
 * `computeSize` returns one of these from a text-only input.
 */
export interface NodeSize {
  width: number
  height: number
}

/**
 * Pure data input to a shape's `computeSize`. The shape does not
 * read from React Flow or from the DOM.
 */
export interface NodeSizeInput {
  label: string
  summary: string
  contentLength?: number
  hasHtml: boolean
  hasChildren: boolean
  depth: number
}

/**
 * Metadata about how a shape exposes connection points to React
 * Flow. The renderer iterates over the returned array and emits a
 * `<Handle>` for each entry.
 */
export interface NodeHandleSpec {
  /** Source (outgoing) or target (incoming). */
  type: 'source' | 'target'
  /** Attachment side on the node's perimeter. */
  position: HandlePosition
  /**
   * When two nodes share more than one connection (e.g. multiple
   * labelled edges), `id` distinguishes the handles. Omit for the
   * single-handle shape (the current one).
   */
  id?: string
}

/**
 * Visual priority hint for the pattern colour. Lower weights mean
 * the shape leans more on its own background; higher weights mean
 * the pattern colour takes over (e.g. accent bar, outline).
 *
 * The renderer multiplies this by the node's pattern colour to
 * derive the actual CSS. Clamped to [0, 1].
 */
export type PatternWeight = 0 | 0.25 | 0.5 | 0.75 | 1

/**
 * The shape contract. A registered shape is one of these objects.
 *
 * `nodeComponent` is a *component reference* — the `nodes/index.ts`
 * side-effect import registers a real JSX component here. Tests
 * for the registry itself stub it with a sentinel function.
 */
export interface NodeShape {
  /** Discriminator. Mirrors `MindMapNode.shape`. */
  readonly name: NodeShapeName
  /**
   * One-line human-readable description. Used in Storybook / docs
   * and (in future) the AI prompt's shape-selection guidance.
   */
  readonly description: string
  /**
   * Default node body width/height hint for dagre. The
   * per-instance `computeSize` is what gets used at layout time.
   */
  readonly defaultSize: NodeSize
  /**
   * How strongly the pattern colour should dominate. `rect` keeps
   * its own neutral surface with the pattern visible as the left
   * accent bar.
   */
  readonly patternWeight: PatternWeight
  /**
   * Where the React Flow connection points are attached. For the
   * current shape this is `[left, right]` — the renderer can
   * therefore elide the right-side handle on leaf-only layouts,
   * but for now we keep things uniform.
   */
  readonly handles: ReadonlyArray<NodeHandleSpec>
  /**
   * Compute the per-instance size hint from the node's text
   * content. Pure function — must be deterministic, side-effect
   * free, and synchronous.
   */
  computeSize(input: NodeSizeInput): NodeSize
  /**
   * The JSX component to mount for this shape. The shape registry
   * stores the reference; the renderer (FlowShell) does the
   * `nodeTypes` plumbing.
   *
   * The component signature is intentionally loose here so we
   * don't pull `@xyflow/react`'s `NodeProps` into a pure-data
   * module. The `nodes/index.ts` side-effect narrows the type
   * where it matters.
   */
  nodeComponent: unknown
}

/**
 * Resolve a possibly-undefined `NodeShapeName` to a concrete
 * shape name, defaulting to `'rect'`. Pure data; does not touch
 * the registry. Stale values from a legacy persisted mindmap
 * (e.g. `chip` / `circle` / `stadium`) collapse to `rect` here so
 * the renderer never has to special-case them.
 */
export function resolveShapeName(value: unknown): NodeShapeName {
  return value === 'rect' ? 'rect' : 'rect'
}
