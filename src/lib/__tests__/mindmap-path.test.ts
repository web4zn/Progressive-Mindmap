import { describe, it, expect } from 'vitest'
import { findAncestorChain } from '../mindmap-path'
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

describe('findAncestorChain', () => {
  it('returns the root id alone for a root node', () => {
    const tree = [makeNode({ id: 'root', label: 'Root' })]
    expect(findAncestorChain(tree, 'root')).toEqual(['root'])
  })

  it('returns [root, child] for a 1-level child', () => {
    const tree = [
      makeNode({
        id: 'root',
        children: [makeNode({ id: 'c1' })],
      }),
    ]
    expect(findAncestorChain(tree, 'c1')).toEqual(['root', 'c1'])
  })

  it('returns a length-4 chain for a 3-level deep node', () => {
    const tree = [
      makeNode({
        id: 'r',
        children: [
          makeNode({
            id: 'a',
            children: [
              makeNode({
                id: 'b',
                children: [makeNode({ id: 'c' })],
              }),
            ],
          }),
        ],
      }),
    ]
    expect(findAncestorChain(tree, 'c')).toEqual(['r', 'a', 'b', 'c'])
  })

  it('returns [] when the node id does not exist anywhere', () => {
    const tree = [
      makeNode({
        id: 'root',
        children: [makeNode({ id: 'c1' })],
      }),
    ]
    expect(findAncestorChain(tree, 'nope')).toEqual([])
  })

  it('returns [] for an empty tree', () => {
    expect(findAncestorChain([], 'anything')).toEqual([])
  })

  it('does not let a sibling tree influence the chain (multi-root)', () => {
    const tree = [
      makeNode({
        id: 'r1',
        children: [makeNode({ id: 'c1', children: [makeNode({ id: 'gc' })] })],
      }),
      makeNode({
        id: 'r2',
        children: [makeNode({ id: 'c2' })],
      }),
    ]
    expect(findAncestorChain(tree, 'gc')).toEqual(['r1', 'c1', 'gc'])
    expect(findAncestorChain(tree, 'c2')).toEqual(['r2', 'c2'])
  })

  it('walks the right branch when multiple roots have similar subtrees', () => {
    const tree = [
      makeNode({
        id: 'r1',
        children: [makeNode({ id: 'shared' })],
      }),
      makeNode({
        id: 'r2',
        children: [makeNode({ id: 'shared', label: 'other' })],
      }),
    ]
    // In a real mindmap the id space is unique, so duplicate ids only
    // exist in adversarial test fixtures. Either chain (r1→shared or
    // r2→shared) is a valid 2-length answer — we just want to assert
    // the function returns *some* root→shared path.
    const chain = findAncestorChain(tree, 'shared')
    expect(chain).toHaveLength(2)
    expect(chain[1]).toBe('shared')
    expect(['r1', 'r2']).toContain(chain[0])
  })
})
