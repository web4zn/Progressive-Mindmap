import type { MindMapNode } from '../types/mindmap'

/**
 * Stage C — search / filter helpers.
 *
 * Pure functions that take a tree + a query and return either the set of
 * matching node ids (for highlight on the canvas) or a filtered copy of
 * the tree (for the Filter panel that hides non-matching nodes).
 *
 * Behaviour:
 *   - Match is case-insensitive substring (no fuzzy / no regex).
 *   - Search runs against `label`, `summary`, and `content` — the three
 *     user-visible fields on a node. Pattern, depth, editedByUser etc.
 *     are matched by the Filter component instead.
 *   - `searchTree` returns a tree that is structurally identical to the
 *     input but with non-matching branches pruned. Parents that do not
 *     match themselves are KEPT when at least one of their descendants
 *     matches, so the highlight set always points to a visible node.
 *   - `matchNodes` returns the flat set of ids that match the query
 *     (ignoring prune-to-parent logic). This is what the search box
 *     uses to drive the "Enter to focus first match" behaviour.
 *
 * Pure: no React, no side effects, fully unit-testable.
 */

export interface SearchOptions {
  /** Override the searchable fields. Default: label, summary, content. */
  fields?: Array<keyof Pick<MindMapNode, 'label' | 'summary' | 'content'>>
}

/**
 * Flat set of node ids whose label / summary / content contain the
 * case-insensitive substring `query`. Empty / whitespace query returns
 * an empty set so the canvas can clear the highlight.
 */
export function matchNodes(
  tree: MindMapNode[],
  query: string,
  options: SearchOptions = {},
): Set<string> {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return new Set()
  const fields = options.fields ?? (['label', 'summary', 'content'] as const)
  const result = new Set<string>()

  function walk(list: MindMapNode[]): void {
    for (const node of list) {
      for (const field of fields) {
        const value = node[field]
        if (typeof value === 'string' && value.toLowerCase().includes(q)) {
          result.add(node.id)
          break
        }
      }
      if (node.children.length > 0) walk(node.children)
    }
  }

  walk(tree)
  return result
}

/**
 * Returns a *new* tree (deep-cloned for the matching branches) that
 * contains only the matching nodes + their ancestors. Useful for the
 * "Filter" panel that hides non-matching nodes.
 *
 * Semantics:
 *   - A node is kept iff `matchSet` contains it OR any of its descendants.
 *   - The output is a deep clone of the input for the kept branches
 *     so mutating the filtered tree does not bleed into the source.
 *   - Children of a kept node are themselves kept iff they (or their
 *     descendants) match. This is the prune rule.
 */
export function searchTree(
  tree: MindMapNode[],
  matchSet: ReadonlySet<string>,
): MindMapNode[] {
  function walk(list: MindMapNode[]): MindMapNode[] {
    const out: MindMapNode[] = []
    for (const node of list) {
      const filteredChildren = walk(node.children)
      const selfMatches = matchSet.has(node.id)
      const hasMatchingDescendant = filteredChildren.length > 0
      if (selfMatches || hasMatchingDescendant) {
        out.push({ ...node, children: filteredChildren })
      }
    }
    return out
  }
  return walk(tree)
}

/**
 * Convenience: returns the matching node ids in the order they were
 * encountered by a depth-first walk. Used by the search box to drive
 * "Enter to focus first match". Pure, deterministic, no allocations
 * beyond the result array.
 */
export function matchNodesInOrder(
  tree: MindMapNode[],
  query: string,
  options: SearchOptions = {},
): string[] {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return []
  const fields = options.fields ?? (['label', 'summary', 'content'] as const)
  const result: string[] = []

  function walk(list: MindMapNode[]): void {
    for (const node of list) {
      for (const field of fields) {
        const value = node[field]
        if (typeof value === 'string' && value.toLowerCase().includes(q)) {
          result.push(node.id)
          break
        }
      }
      if (node.children.length > 0) walk(node.children)
    }
  }

  walk(tree)
  return result
}
