import { describe, it, expect } from 'vitest'
import {
  arrowJumpInTree,
  tabJumpInTree,
  nearestNodeInDirection,
  type NodePosition,
} from '../mindmap-navigate'
import type { MindMapNode } from '../../types/mindmap'

function makeNode(overrides: Partial<MindMapNode> = {}): MindMapNode {
  return {
    id: overrides.id ?? 'n',
    label: overrides.label ?? overrides.id ?? 'n',
    summary: '',
    children: overrides.children ?? [],
    editedByUser: false,
  }
}

/**
 * Layout under test:
 *      r (root)
 *     / \
 *    a   b
 *   / \   \
 *  a1  a2  b1
 */
const tree: MindMapNode[] = [
  makeNode({
    id: 'r',
    children: [
      makeNode({
        id: 'a',
        children: [makeNode({ id: 'a1' }), makeNode({ id: 'a2' })],
      }),
      makeNode({
        id: 'b',
        children: [makeNode({ id: 'b1' })],
      }),
    ],
  }),
]

describe('arrowJumpInTree', () => {
  it('→ from root jumps to first child', () => {
    expect(arrowJumpInTree(tree, 'r', 'right')).toBe('a')
  })

  it('← from root returns null (no parent, no previous sibling)', () => {
    expect(arrowJumpInTree(tree, 'r', 'left')).toBeNull()
  })

  it('← from a child jumps to its parent', () => {
    expect(arrowJumpInTree(tree, 'a1', 'left')).toBe('a')
  })

  it('→ from a leaf with a sibling jumps to next sibling', () => {
    // b1 is a leaf, → would otherwise try first child, fallback to next sibling
    // — but b1 has no siblings, so null.
    expect(arrowJumpInTree(tree, 'b1', 'right')).toBeNull()
  })

  it('→ from a parent with children jumps to first child (not next sibling)', () => {
    expect(arrowJumpInTree(tree, 'a', 'right')).toBe('a1')
  })

  it('↑ from a non-first sibling returns the previous sibling', () => {
    expect(arrowJumpInTree(tree, 'a2', 'up')).toBe('a1')
  })

  it('↑ from the first sibling returns null', () => {
    expect(arrowJumpInTree(tree, 'a1', 'up')).toBeNull()
  })

  it('↓ from a non-last sibling returns the next sibling', () => {
    expect(arrowJumpInTree(tree, 'a1', 'down')).toBe('a2')
  })

  it('↓ from the last sibling returns null', () => {
    expect(arrowJumpInTree(tree, 'a2', 'down')).toBeNull()
  })

  it('returns null for a non-existent id', () => {
    expect(arrowJumpInTree(tree, 'nope', 'down')).toBeNull()
  })
})

describe('tabJumpInTree', () => {
  it('Tab from a parent goes to its first child', () => {
    expect(tabJumpInTree(tree, 'a', false)).toBe('a1')
  })

  it('Tab from a leaf returns null', () => {
    expect(tabJumpInTree(tree, 'a1', false)).toBeNull()
  })

  it('Shift+Tab from a child goes to its parent', () => {
    expect(tabJumpInTree(tree, 'a1', true)).toBe('a')
  })

  it('Shift+Tab from the root returns null', () => {
    expect(tabJumpInTree(tree, 'r', true)).toBeNull()
  })
})

describe('nearestNodeInDirection (position-based)', () => {
  // Place nodes on a small grid (x grows to the right, y grows downward).
  const positions = new Map<string, NodePosition>([
    ['a', { x: 100, y: 50 }],
    ['b', { x: 100, y: 150 }],
    ['c', { x: 100, y: 250 }],
    ['d', { x: 200, y: 150 }], // to the right of b
    ['e', { x: 50, y: 50 }], // to the left of a
  ])

  it('→ from `a` returns `d` (rightmost with same y-ish)', () => {
    // d is at (200, 150) — projection 100, perpendicular 100. a is the source.
    expect(nearestNodeInDirection(positions, 'a', 'right')).toBe('d')
  })

  it('← from `a` returns `e`', () => {
    expect(nearestNodeInDirection(positions, 'a', 'left')).toBe('e')
  })

  it('↓ from `a` returns `b` (next node below a)', () => {
    expect(nearestNodeInDirection(positions, 'a', 'down')).toBe('b')
  })

  it('↑ from `c` returns the node with the smallest projection (closest above)', () => {
    // c is at y=250. Nodes above: a (y=50, dx=0), b (y=150, dx=0), d (y=150, dx=100), e (y=50, dx=-50)
    // projection (y direction = -1) means (250 - y): a=200, b=100, d=100, e=200
    // → b and d tie on projection 100; tiebreak by perpendicular distance from the
    // vertical line through c: b dx=0, d dx=100. b wins.
    expect(nearestNodeInDirection(positions, 'c', 'up')).toBe('b')
  })

  it('returns null when there is no node in the requested direction', () => {
    // Everything is to the right of `e`. Going ← from e finds nothing.
    expect(nearestNodeInDirection(positions, 'e', 'left')).toBeNull()
  })

  it('returns null when the current id is missing from the map', () => {
    expect(nearestNodeInDirection(positions, 'missing', 'right')).toBeNull()
  })

  it('ignores the current node when computing the nearest', () => {
    const local = new Map<string, NodePosition>([
      ['x', { x: 0, y: 0 }],
      ['y', { x: 10, y: 0 }],
    ])
    expect(nearestNodeInDirection(local, 'x', 'right')).toBe('y')
  })
})
