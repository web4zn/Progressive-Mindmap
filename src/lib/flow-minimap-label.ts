/**
 * flow-minimap-label — mindmap-shell-v2 (task 5).
 *
 * Pure helpers for the v2 MiniMap text preview. The MiniMap now
 * shows the first non-whitespace character of each node's label
 * (truncated to a single glyph) so the user can recognise the
 * structure at a glance — Dify-style "node fingerprint".
 *
 * Why a dedicated helper instead of inlining:
 *  - The label-extraction rule is non-trivial (CJK handling, emoji,
 *    surrogate pairs, fall-back to the first ASCII letter).
 *  - Multiple call sites — the MiniMap overlay and the future
 *    thumbnail component — share the same logic.
 *  - Pure functions are easy to unit-test without a DOM.
 */

import type { Node } from '@xyflow/react'

/**
 * The raw shape the MiniMap cares about. We don't depend on the
 * full `FlowNodeData` here so this helper can be reused in any
 * context that surfaces a `label: string` field.
 */
export interface NodeLike {
  data?: { label?: unknown } | undefined
}

/**
 * Extract a single "preview character" from a node's label.
 *
 * Rules, in priority order:
 *  1. Skip leading whitespace.
 *  2. Return the first non-whitespace code point. We support the
 *     full Unicode range (surrogate pairs are joined back into a
 *     single string with `String.fromCodePoint`).
 *  3. If the label is empty / whitespace-only / non-string, return
 *     `null` so the caller can render a fallback glyph.
 */
export function firstLabelChar(label: string | undefined | null): string | null {
  if (typeof label !== 'string') return null
  const trimmed = label.trim()
  if (trimmed.length === 0) return null
  // `codePointAt(0)` is safe for surrogate pairs (e.g. emoji
  // rendered as a single 4-byte char).
  const cp = trimmed.codePointAt(0)
  if (cp === undefined) return null
  return String.fromCodePoint(cp)
}

/**
 * Convenience wrapper for the React Flow `Node` shape. Accepts
 * the full `Node` and reads `node.data?.label`. Anything that
 * isn't a string is treated as an empty label.
 */
export function firstLabelCharFromNode(node: Node | NodeLike): string | null {
  const data = node.data as { label?: unknown } | undefined
  if (!data) return null
  return firstLabelChar(typeof data.label === 'string' ? data.label : null)
}

/**
 * A short (1- or 2-character) preview string for compact lists. For
 * now it's identical to `firstLabelChar`; the name is forward-
 * looking in case we later want to render two glyphs (e.g. the
 * first two CJK characters) on the MiniMap.
 */
export function previewLabel(node: Node | NodeLike): string | null {
  return firstLabelCharFromNode(node)
}
