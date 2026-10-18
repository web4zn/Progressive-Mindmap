import type { MindMapNode } from '../types/mindmap'
import { isDescendantOf } from './mindmap-layout'

/**
 * Decide whether a drag gesture is a re-parent (drop onto another node) or a
 * reposition (drop onto empty canvas).
 *
 * Extracted from `MindMapTree` so the rule is testable without React Flow:
 * a candidate node is a valid drop target only when it is not the dragged
 * node itself, not the dragged node's current parent (dropping back onto the
 * parent is a reposition, not a re-parent) and not one of its descendants
 * (which would create a cycle).
 *
 * @returns the id of the node to re-parent onto, or `''` when the drop is not
 *          a re-parent gesture.
 */
export function pickReparentTarget(
  intersectingIds: ReadonlyArray<string>,
  draggedId: string,
  draggedNode: MindMapNode,
  oldParentId: string | undefined,
): string {
  for (const candidateId of intersectingIds) {
    if (candidateId === draggedId) continue
    if (oldParentId !== undefined && candidateId === oldParentId) continue
    if (isDescendantOf(draggedNode, candidateId)) continue
    return candidateId
  }
  return ''
}

/**
 * Ids of a node and all of its descendants, depth-first (the node itself
 * first). Used to move a whole branch with the node the user dragged.
 */
export function collectSubtreeIds(node: MindMapNode): string[] {
  const ids: string[] = []
  const walk = (current: MindMapNode): void => {
    ids.push(current.id)
    for (const child of current.children) walk(child)
  }
  walk(node)
  return ids
}
