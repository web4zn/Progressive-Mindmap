import type { MindMapNode } from '../types/mindmap'
import { findParentInTree } from './mindmap-layout'

/**
 * Stage C — keyboard navigation helpers.
 *
 * Pure functions that compute the next node to select when the user
 * presses an arrow key / Tab / Shift+Tab. The visual layout is
 * `dagre LR` (left-to-right), so:
 *
 *   ←  parent (or previous sibling if no parent)
 *   →  first child (or next sibling if no children)
 *   ↑  previous sibling
 *   ↓  next sibling
 *   Tab      first child
 *   Shift+Tab parent
 *
 * For a free-form position-based fallback (when sibling structure is
 * ambiguous) the helper accepts an optional `positions: Map<id, {x,y}>`.
 * The algorithm picks the node with the smallest squared distance whose
 * displacement in the requested direction is dominant. This is what
 * the spec calls "方向键基于 React Flow 节点位置算最近".
 *
 * Pure: no React, no side effects, fully unit-testable.
 */

export type ArrowDirection = 'up' | 'down' | 'left' | 'right'

export interface NodePosition {
  x: number
  y: number
}

/**
 * Sibling-or-parent based jump. Used when the user presses ← / → / ↑ / ↓
 * on a node that has a well-defined tree position.
 *
 * Returns the next node id, or `null` when the request is a no-op
 * (e.g. pressing ↑ on the first sibling). The caller decides whether
 * to also deselect / cancel.
 */
export function arrowJumpInTree(
  tree: MindMapNode[],
  currentId: string,
  direction: ArrowDirection,
): string | null {
  const current = findNodeInTreeOrNull(tree, currentId)
  if (!current) return null

  switch (direction) {
    case 'right': {
      // First child if any
      const first = current.children[0]
      return first ? first.id : nextSibling(tree, currentId)
    }
    case 'left': {
      // Parent (in our flow direction parents are physically to the left)
      const parent = findParentInTree(tree, currentId)
      if (parent) return parent.id
      return previousSibling(tree, currentId)
    }
    case 'up':
      return previousSibling(tree, currentId)
    case 'down':
      return nextSibling(tree, currentId)
    default:
      return null
  }
}

/**
 * Tab / Shift+Tab jump — child / parent only. Returns null at the
 * root (no parent) or a leaf (no children).
 */
export function tabJumpInTree(
  tree: MindMapNode[],
  currentId: string,
  shift: boolean,
): string | null {
  if (shift) {
    return findParentInTree(tree, currentId)?.id ?? null
  }
  const current = findNodeInTreeOrNull(tree, currentId)
  const first = current?.children[0]
  return first?.id ?? null
}

/**
 * Position-based "nearest node" jump. Used when the user wants to
 * navigate freely in the canvas, or as a fallback when the sibling
 * rule has no answer (e.g. an only child trying to go ↓).
 *
 * Algorithm:
 *   1. Filter out the current node.
 *   2. Compute the unit direction vector for the arrow:
 *        ↑/↓ → (0, ±1)  → rank by Y distance, tiebreak X
 *        ←/→ → (±1, 0)  → rank by X distance, tiebreak Y
 *   3. For each candidate, compute the signed projection onto the
 *      direction unit vector. Only candidates with projection > 0
 *      (i.e. actually in the requested direction) are considered.
 *   4. Pick the one with the smallest projection (closest in the
 *      direction) breaking ties by perpendicular distance.
 *
 * Returns the candidate id, or null if there is no node in that
 * direction. When the caller does not pass positions for every node,
 * the missing entries are simply ignored.
 */
export function nearestNodeInDirection(
  positions: ReadonlyMap<string, NodePosition>,
  currentId: string,
  direction: ArrowDirection,
): string | null {
  const current = positions.get(currentId)
  if (!current) return null
  const dirVec: NodePosition =
    direction === 'up'
      ? { x: 0, y: -1 }
      : direction === 'down'
        ? { x: 0, y: 1 }
        : direction === 'left'
          ? { x: -1, y: 0 }
          : { x: 1, y: 0 }

  let bestId: string | null = null
  let bestProjection = Infinity
  let bestPerpendicular = Infinity

  for (const [id, pos] of positions) {
    if (id === currentId) continue
    const dx = pos.x - current.x
    const dy = pos.y - current.y
    const projection = dx * dirVec.x + dy * dirVec.y
    if (projection <= 0) continue // wrong side
    const perpendicular = Math.abs(dx * -dirVec.y + dy * dirVec.x)
    if (
      projection < bestProjection ||
      (projection === bestProjection && perpendicular < bestPerpendicular)
    ) {
      bestId = id
      bestProjection = projection
      bestPerpendicular = perpendicular
    }
  }
  return bestId
}

// ── private helpers ───────────────────────────────────────────────────────

function findNodeInTreeOrNull(tree: MindMapNode[], id: string): MindMapNode | null {
  for (const n of tree) {
    if (n.id === id) return n
    const inner = findNodeInTreeOrNull(n.children, id)
    if (inner) return inner
  }
  return null
}

function previousSibling(tree: MindMapNode[], currentId: string): string | null {
  const parent = findParentInTree(tree, currentId)
  if (!parent) return null
  const idx = parent.children.findIndex((c) => c.id === currentId)
  if (idx <= 0) return null
  return parent.children[idx - 1]?.id ?? null
}

function nextSibling(tree: MindMapNode[], currentId: string): string | null {
  const parent = findParentInTree(tree, currentId)
  if (!parent) return null
  const idx = parent.children.findIndex((c) => c.id === currentId)
  if (idx === -1 || idx >= parent.children.length - 1) return null
  return parent.children[idx + 1]?.id ?? null
}
