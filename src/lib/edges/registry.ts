/**
 * Edge-strategy registry — mindmap-shell-v2 (task 2).
 *
 * Pure-data registry of all available edge strategies. Mirrors
 * the node-shape registry's design (Map, O(1) lookup, safe
 * fallback, registry reset for tests).
 */
import type { EdgeStyleName } from '../../types/mindmap'
import { type EdgeStrategy, resolveEdgeStyleName } from './types'

// ─── Sentinel component placeholder (Task 3 swaps this out) ────────

const PLACEHOLDER_COMPONENT = (() => {
  const tag = '[edge-registry] edgeComponent not yet registered'
  return function Placeholder() {
    throw new Error(tag)
  }
})()

// ─── Strategy entries (pure data) ──────────────────────────────────

/**
 * `smoothstep` — orthogonal right-angle path with rounded
 * corners. The visual default for the v1 mindmap; carried over
 * unchanged for backwards compatibility.
 */
const smoothstepStrategy: EdgeStrategy = {
  name: 'smoothstep',
  description: '直角折线(默认)— 通用,有层次感',
  defaultMarker: 'arrow',
  animation: 'flow',
  supportsFlow: true,
  edgeComponent: PLACEHOLDER_COMPONENT,
}

/**
 * `bezier` — smooth cubic-bezier curve. Recommended for
 * root-node edges and any path that should feel "elegant"
 * rather than "structural".
 */
const bezierStrategy: EdgeStrategy = {
  name: 'bezier',
  description: '平滑贝塞尔曲线 — 根节点/重要连接的优雅选择',
  defaultMarker: 'arrow',
  animation: 'flow',
  supportsFlow: true,
  edgeComponent: PLACEHOLDER_COMPONENT,
}

/**
 * `straight` — direct line, no curve. Reads as "terminal" /
 * "leaf" — used in v2 for edges whose target is a `stadium` /
 * `circle` node.
 */
const straightStrategy: EdgeStrategy = {
  name: 'straight',
  description: '直线 — 叶节点/简洁连接',
  defaultMarker: 'arrow',
  animation: 'none',
  supportsFlow: true,
  edgeComponent: PLACEHOLDER_COMPONENT,
}

// ─── The registry itself ────────────────────────────────────────────

const registry = new Map<EdgeStyleName, EdgeStrategy>([
  ['smoothstep', smoothstepStrategy],
  ['bezier', bezierStrategy],
  ['straight', straightStrategy],
])

/**
 * Look up an edge strategy by name. Unknown / missing values
 * fall back to `'smoothstep'` so an old / corrupt edge record
 * still renders.
 */
export function getEdgeStrategy(name: unknown): EdgeStrategy {
  const resolved = resolveEdgeStyleName(name)
  return registry.get(resolved) ?? smoothstepStrategy
}

/**
 * List all registered edge strategies in declaration order. The
 * UI's "edge style" picker and the AI prompt both read this.
 */
export function listEdgeStrategies(): ReadonlyArray<EdgeStrategy> {
  return [...registry.values()]
}

/**
 * Register (or replace) an edge strategy. Task 3 calls this
 * once per strategy with the real JSX component.
 *
 * Throws if `strategy.name` is not a valid `EdgeStyleName` —
 * we refuse to add arbitrary strings to the registry.
 */
export function registerEdgeStrategy(strategy: EdgeStrategy): void {
  registry.set(strategy.name, strategy)
}

/**
 * Test-only: reset the registry to its built-in defaults.
 * Production code must not call this.
 */
export function __resetEdgeStrategyRegistryForTests(): void {
  registry.clear()
  registry.set('smoothstep', smoothstepStrategy)
  registry.set('bezier', bezierStrategy)
  registry.set('straight', straightStrategy)
}

/**
 * True when the given string is a registered edge strategy name.
 * Stricter than `isEdgeStyleName` (which checks the union).
 */
export function hasEdgeStrategy(name: unknown): name is EdgeStyleName {
  return typeof name === 'string' && registry.has(name as EdgeStyleName)
}
