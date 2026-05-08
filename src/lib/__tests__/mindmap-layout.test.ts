import { describe, it, expect } from 'vitest'
import { treeToFlow, findNodeInTree, findParentInTree, isDescendantOf } from '../mindmap-layout'
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

describe('treeToFlow', () => {
  it('flattens single node', () => {
    const tree = [makeNode({ id: 'root', label: 'Root' })]
    const { nodes, edges } = treeToFlow(tree)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.data.label).toBe('Root')
    expect(edges).toHaveLength(0)
  })

  it('creates edges for parent-child', () => {
    const tree = [
      makeNode({ id: 'root', children: [makeNode({ id: 'c1' }), makeNode({ id: 'c2' })] }),
    ]
    const { nodes, edges } = treeToFlow(tree)
    expect(nodes).toHaveLength(3)
    expect(edges).toHaveLength(2)
    expect(edges[0]!.source).toBe('root')
    expect(edges[0]!.target).toBe('c1')
    expect(edges[1]!.target).toBe('c2')
  })

  it('hides collapsed subtree', () => {
    const tree = [
      makeNode({
        id: 'root',
        children: [makeNode({ id: 'c1', children: [makeNode({ id: 'gc1' })] })],
      }),
    ]
    const { nodes, edges } = treeToFlow(tree, new Set(['c1']))
    expect(nodes.map((n) => n.id)).toEqual(['root', 'c1'])
    expect(edges).toHaveLength(1)
  })

  it('marks hasChildren and collapsed in data', () => {
    const tree = [makeNode({ id: 'root', children: [makeNode({ id: 'c1' })] })]
    const { nodes } = treeToFlow(tree, new Set(['c1']))
    const c1 = nodes.find((n) => n.id === 'c1')!
    expect(c1.data.hasChildren).toBe(false)
  })
})

describe('findNodeInTree', () => {
  it('finds nested node', () => {
    const tree = [makeNode({ id: 'root', children: [makeNode({ id: 'c1' })] })]
    expect(findNodeInTree(tree, 'c1')!.id).toBe('c1')
  })

  it('returns null for missing', () => {
    expect(findNodeInTree([], 'x')).toBeNull()
  })
})

describe('findParentInTree', () => {
  it('finds parent', () => {
    const tree = [makeNode({ id: 'root', children: [makeNode({ id: 'c1' })] })]
    expect(findParentInTree(tree, 'c1')!.id).toBe('root')
  })

  it('returns null for root', () => {
    const tree = [makeNode({ id: 'root' })]
    expect(findParentInTree(tree, 'root')).toBeNull()
  })
})

describe('isDescendantOf', () => {
  it('direct child is descendant', () => {
    const node = makeNode({ id: 'root', children: [makeNode({ id: 'c1' })] })
    expect(isDescendantOf(node, 'c1')).toBe(true)
  })

  it('grandchild is descendant', () => {
    const node = makeNode({
      id: 'root',
      children: [makeNode({ id: 'c1', children: [makeNode({ id: 'gc1' })] })],
    })
    expect(isDescendantOf(node, 'gc1')).toBe(true)
  })

  it('sibling is not descendant', () => {
    const node = makeNode({ id: 'c1' })
    expect(isDescendantOf(node, 'c2')).toBe(false)
  })
})
