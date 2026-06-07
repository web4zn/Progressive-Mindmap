import { describe, it, expect } from 'vitest'
import { matchNodes, matchNodesInOrder, searchTree } from '../mindmap-search'
import type { MindMapNode } from '../../types/mindmap'

function makeNode(overrides: Partial<MindMapNode> = {}): MindMapNode {
  return {
    id: overrides.id ?? 'n1',
    label: overrides.label ?? '',
    summary: overrides.summary ?? '',
    content: overrides.content,
    contentType: overrides.contentType,
    children: overrides.children ?? [],
    editedByUser: overrides.editedByUser ?? false,
  }
}

describe('matchNodes', () => {
  it('empty query returns an empty set', () => {
    const tree = [makeNode({ id: 'a', label: 'A' })]
    expect(matchNodes(tree, '').size).toBe(0)
    expect(matchNodes(tree, '   ').size).toBe(0)
  })

  it('matches against label (case-insensitive)', () => {
    const tree = [
      makeNode({ id: 'a', label: 'React 学习' }),
      makeNode({ id: 'b', label: 'Vue 入门' }),
    ]
    const result = matchNodes(tree, 'react')
    expect(result.has('a')).toBe(true)
    expect(result.has('b')).toBe(false)
  })

  it('matches against summary', () => {
    const tree = [makeNode({ id: 'a', label: 'Root', summary: '深度学习 101' })]
    expect(matchNodes(tree, '深度').has('a')).toBe(true)
  })

  it('matches against content (HTML body)', () => {
    const tree = [
      makeNode({
        id: 'a',
        label: 'Node',
        content: '<p>该 <strong>API</strong> 是幂等的</p>',
        contentType: 'html',
      }),
    ]
    const result = matchNodes(tree, 'API')
    expect(result.has('a')).toBe(true)
  })

  it('walks the entire tree (depth-first)', () => {
    const tree = [
      makeNode({
        id: 'root',
        label: 'Root',
        children: [
          makeNode({ id: 'c1', label: 'alpha' }),
          makeNode({ id: 'c2', label: 'beta', children: [makeNode({ id: 'gc', label: 'gamma' })] }),
        ],
      }),
    ]
    const result = matchNodes(tree, 'gamma')
    expect(result.size).toBe(1)
    expect(result.has('gc')).toBe(true)
  })

  it('returns multiple matches across different fields', () => {
    const tree = [
      makeNode({ id: 'a', label: 'Foo' }),
      makeNode({ id: 'b', summary: 'foo bar' }),
      makeNode({ id: 'c', label: 'baz' }),
    ]
    const result = matchNodes(tree, 'foo')
    expect(result.size).toBe(2)
    expect(result.has('a')).toBe(true)
    expect(result.has('b')).toBe(true)
    expect(result.has('c')).toBe(false)
  })

  it('returns empty set when nothing matches', () => {
    const tree = [makeNode({ id: 'a', label: 'Foo' })]
    expect(matchNodes(tree, 'xyz').size).toBe(0)
  })

  it('does not match on fields that are absent (undefined content)', () => {
    const tree = [makeNode({ id: 'a', label: 'A' /* no content, no summary */ })]
    expect(matchNodes(tree, 'A').has('a')).toBe(true)
    expect(matchNodes(tree, 'undefined').size).toBe(0)
  })
})

describe('matchNodesInOrder', () => {
  it('returns ids in DFS pre-order', () => {
    const tree = [
      makeNode({
        id: 'root',
        label: 'root',
        children: [makeNode({ id: 'a', label: 'foo' }), makeNode({ id: 'b', label: 'bar' })],
      }),
    ]
    expect(matchNodesInOrder(tree, 'foo')).toEqual(['a'])
    expect(matchNodesInOrder(tree, 'o')).toEqual(['root', 'a'])
  })

  it('preserves the natural tree order, not alphabetical', () => {
    const tree = [
      makeNode({
        id: 'z',
        label: 'target',
        children: [makeNode({ id: 'a', label: 'target' })],
      }),
    ]
    expect(matchNodesInOrder(tree, 'target')).toEqual(['z', 'a'])
  })
})

describe('searchTree (prune-to-ancestor)', () => {
  it('keeps a parent when a descendant matches', () => {
    const tree = [
      makeNode({
        id: 'root',
        label: 'Root',
        children: [
          makeNode({ id: 'keep', label: 'no match', children: [makeNode({ id: 'leaf', label: 'foo' })] }),
          makeNode({ id: 'drop', label: 'no match' }),
        ],
      }),
    ]
    const result = searchTree(tree, new Set(['leaf']))
    // root kept (ancestor of leaf), keep kept (parent of leaf), drop pruned,
    // leaf kept (the match itself)
    expect(result.map((n) => n.id)).toEqual(['root'])
    const rootChildren = result[0]!.children
    expect(rootChildren.map((c) => c.id)).toEqual(['keep'])
    expect(rootChildren[0]!.children.map((c) => c.id)).toEqual(['leaf'])
  })

  it('drops an entire subtree when no descendant matches', () => {
    const tree = [
      makeNode({
        id: 'root',
        label: 'Root',
        children: [makeNode({ id: 'drop', label: 'no match', children: [makeNode({ id: 'leaf', label: 'no match' })] })],
      }),
    ]
    const result = searchTree(tree, new Set(['root']))
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('root')
    expect(result[0]!.children).toHaveLength(0)
  })

  it('empty match set returns empty tree', () => {
    const tree = [makeNode({ id: 'a', label: 'A' })]
    expect(searchTree(tree, new Set())).toEqual([])
  })

  it('does not mutate the input tree', () => {
    const tree = [
      makeNode({
        id: 'root',
        children: [makeNode({ id: 'a', label: 'foo', children: [makeNode({ id: 'b', label: 'bar' })] })],
      }),
    ]
    const before = JSON.stringify(tree)
    searchTree(tree, new Set(['b']))
    expect(JSON.stringify(tree)).toBe(before)
  })
})
