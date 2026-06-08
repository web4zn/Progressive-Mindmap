/**
 * Node-shape registry.
 *
 * Pure-data registry of every available node shape. The renderer
 * (`FlowShell`) reads from this to build React Flow's `nodeTypes`
 * map. The mindmap v2 ships a single shape (`rect`); the registry
 * shape is preserved so a future variant can be added without
 * rewriting the renderer.
 *
 * Conventions:
 *  - `nodeComponent` is a placeholder sentinel in this file. The
 *    `nodes/index.ts` side-effect import swaps it for the real JSX
 *    on register.
 *  - Adding a new shape: write an entry below, call `register*`,
 *    and provide a JSX component. The rest of the codebase picks
 *    it up automatically.
 */
import type { NodeShapeName } from '../../types/mindmap'
import {
  type NodeHandleSpec,
  type NodeShape,
  type NodeSize,
  type NodeSizeInput,
  resolveShapeName,
} from './types'

// ─── Sentinel component placeholder ────────────────────────────────
//
// We can't return a real React component from a pure-data file, so
// we use a function reference as a stand-in. `nodes/index.ts`
// overwrites this with a real JSX component. Tests that exercise
// the registry stub `nodeComponent` before they exercise it.

const PLACEHOLDER_COMPONENT = (() => {
  const tag = '[shape-registry] nodeComponent not yet registered'
  return function Placeholder() {
    throw new Error(tag)
  }
})()

// ─── Default handle layout ────────────────────────────────────────

const DEFAULT_LR_HANDLES: ReadonlyArray<NodeHandleSpec> = [
  { type: 'target', position: 'left' },
  { type: 'source', position: 'right' },
]

// ─── Size helpers ─────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Mirror the v1 `computeNodeSize` heuristic, parameterised on
 * `defaultHeight` / `defaultHeightWithSummary` so each shape can
 * express its own visual identity without rewriting the text-fit
 * math.
 *
 * CJK label characters are ~2 monospace columns wide; the v1
 * heuristic treated `label.length` as a rough width and bumped it
 * by 0.85 to underweight CJK. We keep the same approximation so
 * the layout doesn't shift when shape changes.
 */
function computeTextSize(
  input: NodeSizeInput,
  bounds: { minWidth: number; maxWidth: number; baseHeight: number; perSummaryLine: number },
): NodeSize {
  const labelLen = input.label.length
  const labelWidth = Math.ceil(labelLen * 0.85)
  const summaryLines = input.summary ? Math.max(1, Math.ceil(input.summary.length / 24)) : 0
  const summaryWidth = summaryLines * 24
  const contentWidth = Math.max(labelWidth, summaryWidth) + 32
  const rowPadding = input.hasChildren ? 48 : 32
  const width = clamp(contentWidth + rowPadding, bounds.minWidth, bounds.maxWidth)
  const height = clamp(bounds.baseHeight + summaryLines * bounds.perSummaryLine, 36, 160)
  return { width, height }
}

// ─── Shape entries (pure data) ─────────────────────────────────────

/**
 * `rect` — the default Dify-style card. 12 px corner radius, 1 px
 * border, 3 px accent bar on the left. Three-segment layout
 * (header / body / footer).
 */
const rectShape: NodeShape = {
  name: 'rect',
  description: '默认矩形卡片 — 信息密度高,适合"要读"的节点',
  defaultSize: { width: 220, height: 80 },
  patternWeight: 0.5,
  handles: DEFAULT_LR_HANDLES,
  computeSize: (input) =>
    computeTextSize(input, {
      minWidth: 120,
      maxWidth: 280,
      baseHeight: 46,
      perSummaryLine: 18,
    }),
  nodeComponent: PLACEHOLDER_COMPONENT,
}

// ─── The registry itself ──────────────────────────────────────────

/**
 * Internal store. We use a `Map` so lookup is O(1) and insertion
 * preserves declaration order.
 */
const registry = new Map<NodeShapeName, NodeShape>([['rect', rectShape]])

/**
 * Look up a shape by name. Unknown names fall back to `'rect'` —
 * the canonical default — so a stale or corrupt `MindMapNode.shape`
 * value (e.g. `chip` / `circle` / `stadium` left over from a
 * earlier persisted mindmap) still renders.
 */
export function getNodeShape(name: unknown): NodeShape {
  const resolved = resolveShapeName(name)
  return registry.get(resolved) ?? rectShape
}

/**
 * List all registered shapes in declaration order. The renderer
 * uses this to build the React Flow `nodeTypes` map; future AI
 * prompts can use it to teach the LLM the available palette.
 */
export function listNodeShapes(): ReadonlyArray<NodeShape> {
  return [...registry.values()]
}

/**
 * Register (or replace) a shape. The `nodes/index.ts` side-effect
 * import calls this once per shape with the real JSX component.
 *
 * Throws if `shape.name` is not a valid `NodeShapeName` — we
 * refuse to pollute the registry with arbitrary strings, since
 * downstream code (CSS classes, AI prompts) keys off the literal.
 */
export function registerNodeShape(shape: NodeShape): void {
  registry.set(shape.name, shape)
}

/**
 * Test-only: reset the registry to its built-in defaults. Tests
 * that exercise the registry stub `nodeComponent` between cases
 * use this; production code must not call this.
 */
export function __resetNodeShapeRegistryForTests(): void {
  registry.clear()
  registry.set('rect', rectShape)
}

/**
 * True when the given string is a registered shape name. Stricter
 * than the type-guard in `./types` — it additionally requires an
 * entry to exist in the live registry.
 */
export function hasNodeShape(name: unknown): name is NodeShapeName {
  return typeof name === 'string' && registry.has(name as NodeShapeName)
}
