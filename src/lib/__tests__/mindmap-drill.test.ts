import { describe, it, expect } from 'vitest'
import { findNodeInTree } from '../mindmap-layout'
import type { MindMapNode } from '../../types/mindmap'

function makeNode(overrides: Partial<MindMapNode> = {}): MindMapNode {
  return {
    id: overrides.id ?? 'n1',
    label: overrides.label ?? 'Test',
    summary: overrides.summary ?? '',
    children: overrides.children ?? [],
    editedByUser: overrides.editedByUser ?? false,
  }
}

/**
 * Extracts a drill-down subtree: finds the node matching `drillId` and
 * returns it as a single-root array. Returns the original tree when no
 * match is found. This mirrors the effectiveTree logic in MindMapTree.
 */
function drillSubtree(tree: MindMapNode[], drillId: string | null): MindMapNode[] {
  if (!drillId) return tree
  const node = findNodeInTree(tree, drillId)
  return node ? [node] : tree
}

describe('drillSubtree', () => {
  it('returns full tree when drillId is null', () => {
    const tree = [makeNode({ id: 'root' })]
    expect(drillSubtree(tree, null)).toBe(tree)
  })

  it('extracts a root node as single-element array', () => {
    const tree = [makeNode({ id: 'root', label: 'Root' })]
    const result = drillSubtree(tree, 'root')
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('root')
  })

  it('extracts nested subtree keeping children intact', () => {
    const tree = [
      makeNode({
        id: 'root',
        children: [
          makeNode({
            id: 'a',
            children: [
              makeNode({ id: 'a1' }),
              makeNode({ id: 'a2', children: [makeNode({ id: 'a2a' })] }),
            ],
          }),
          makeNode({ id: 'b' }),
        ],
      }),
    ]
    const result = drillSubtree(tree, 'a')
    expect(result).toHaveLength(1)
    const subtree = result[0]
    expect(subtree?.id).toBe('a')
    expect(subtree?.children).toHaveLength(2)
    expect(subtree?.children[0]?.id).toBe('a1')
    expect(subtree?.children[1]?.id).toBe('a2')
    // Sibling 'b' is excluded.
  })

  it('preserves deep nesting in extracted subtree', () => {
    const tree = [
      makeNode({
        id: 'r',
        children: [
          makeNode({
            id: 'x',
            children: [
              makeNode({
                id: 'y',
                children: [
                  makeNode({ id: 'z1' }),
                  makeNode({ id: 'z2' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ]
    const result = drillSubtree(tree, 'y')
    expect(result).toHaveLength(1)
    const y = result[0]
    expect(y?.id).toBe('y')
    expect(y?.children).toHaveLength(2)
    expect((y as MindMapNode).children[0]?.id).toBe('z1')
    expect((y as MindMapNode).children[1]?.id).toBe('z2')
  })

  it('returns original tree when drillId not found (safety fallback)', () => {
    const tree = [makeNode({ id: 'only' })]
    const result = drillSubtree(tree, 'nonexistent')
    expect(result).toBe(tree)
  })

  it('handles multi-root tree — only extracts the matching root', () => {
    const tree = [
      makeNode({ id: 'r1', label: 'Root1', children: [makeNode({ id: 'r1c' })] }),
      makeNode({ id: 'r2', label: 'Root2', children: [makeNode({ id: 'r2c' })] }),
    ]
    const result = drillSubtree(tree, 'r1')
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('r1')
    expect(result[0]?.children).toHaveLength(1)
    expect(result[0]?.children[0]?.id).toBe('r1c')
  })

  it('leaf node subtree is just the node itself (no children)', () => {
    const tree = [
      makeNode({
        id: 'root',
        children: [makeNode({ id: 'leaf', children: [] })],
      }),
    ]
    const result = drillSubtree(tree, 'leaf')
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('leaf')
    expect(result[0]?.children).toEqual([])
  })
})
