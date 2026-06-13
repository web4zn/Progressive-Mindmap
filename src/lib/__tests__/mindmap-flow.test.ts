import { describe, it, expect, vi } from 'vitest'
import { treeToFlowShell, computeNodeSize } from '../mindmap-flow'
import type { MindMapNode } from '../../types/mindmap'

function makeNode(overrides: Partial<MindMapNode> = {}): MindMapNode {
  return {
    id: overrides.id ?? 'n1',
    label: overrides.label ?? 'Test',
    summary: overrides.summary ?? '',
    content: overrides.content,
    contentType: overrides.contentType,
    children: overrides.children ?? [],
    editedByUser: overrides.editedByUser ?? false,
  }
}

const noop = () => {}

describe('treeToFlowShell', () => {
  it('empty tree returns empty arrays', () => {
    const { nodes, edges } = treeToFlowShell([], new Set(), noop, 'auto')
    expect(nodes).toEqual([])
    expect(edges).toEqual([])
  })

  it('linear tree: root + 3 children has 4 nodes and 3 edges', () => {
    const tree = [
      makeNode({
        id: 'root',
        label: 'Root',
        children: [
          makeNode({ id: 'c1', label: 'Child 1' }),
          makeNode({ id: 'c2', label: 'Child 2' }),
          makeNode({ id: 'c3', label: 'Child 3' }),
        ],
      }),
    ]
    const { nodes, edges } = treeToFlowShell(tree, new Set(), noop, 'auto')
    expect(nodes).toHaveLength(4)
    expect(edges).toHaveLength(3)
    // Root has no parent edge
    const rootEdge = edges.find((e) => e.target === 'root')
    expect(rootEdge).toBeUndefined()
    // Children each have a parent edge from root
    expect(edges.find((e) => e.source === 'root' && e.target === 'c1')).toBeDefined()
    expect(edges.find((e) => e.source === 'root' && e.target === 'c2')).toBeDefined()
    expect(edges.find((e) => e.source === 'root' && e.target === 'c3')).toBeDefined()
  })

  it('branching tree: root + 2 children + 4 grandchildren has 7 nodes and 6 edges', () => {
    const tree = [
      makeNode({
        id: 'root',
        children: [
          makeNode({
            id: 'a',
            children: [
              makeNode({ id: 'a1' }),
              makeNode({ id: 'a2' }),
            ],
          }),
          makeNode({
            id: 'b',
            children: [
              makeNode({ id: 'b1' }),
              makeNode({ id: 'b2' }),
            ],
          }),
        ],
      }),
    ]
    const { nodes, edges } = treeToFlowShell(tree, new Set(), noop, 'auto')
    expect(nodes).toHaveLength(7)
    // 1 root edge excluded + 2 child edges + 4 grandchild edges = 6
    expect(edges).toHaveLength(6)
  })

  it('collapsedIds hides descendants', () => {
    const tree = [
      makeNode({
        id: 'root',
        children: [
          makeNode({
            id: 'c1',
            children: [makeNode({ id: 'gc1' }), makeNode({ id: 'gc2' })],
          }),
          makeNode({ id: 'c2' }),
        ],
      }),
    ]
    const { nodes, edges } = treeToFlowShell(tree, new Set(['c1']), noop, 'auto')
    // Expect: root, c1, c2 — grandchildren hidden
    expect(nodes.map((n) => n.id).sort()).toEqual(['c1', 'c2', 'root'])
    expect(edges).toHaveLength(2) // root→c1, root→c2
    // collapsed node should still be present
    const c1 = nodes.find((n) => n.id === 'c1')!
    expect(c1.data.collapsed).toBe(true)
    expect(c1.data.hasChildren).toBe(true)
  })

  it('root node has no parent edge', () => {
    const tree = [makeNode({ id: 'root' })]
    const { edges } = treeToFlowShell(tree, new Set(), noop, 'auto')
    expect(edges).toHaveLength(0)
  })

  it('multiple roots: each root has no edge', () => {
    const tree = [makeNode({ id: 'r1' }), makeNode({ id: 'r2' })]
    const { nodes, edges } = treeToFlowShell(tree, new Set(), noop, 'auto')
    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(0)
  })

  it('depth starts at the provided value and increments', () => {
    const tree = [
      makeNode({
        id: 'root',
        children: [makeNode({ id: 'c1', children: [makeNode({ id: 'gc1' })] })],
      }),
    ]
    // Start at depth 2 → root=2, c1=3, gc1=4
    const { nodes } = treeToFlowShell(tree, new Set(), noop, 'auto', 2)
    const root = nodes.find((n) => n.id === 'root')!
    const c1 = nodes.find((n) => n.id === 'c1')!
    const gc1 = nodes.find((n) => n.id === 'gc1')!
    expect(root.data.depth).toBe(2)
    expect(c1.data.depth).toBe(3)
    expect(gc1.data.depth).toBe(4)
  })

  it('passes through hasChildren, editedByUser, contentType, summary, content', () => {
    const tree = [
      makeNode({
        id: 'parent',
        editedByUser: false,
        children: [
          makeNode({
            id: 'child',
            summary: 'a summary',
            content: '<p>html body</p>',
            contentType: 'html',
            editedByUser: true,
            children: [],
          }),
        ],
      }),
    ]
    const { nodes } = treeToFlowShell(tree, new Set(), noop, 'tech')
    const parent = nodes.find((n) => n.id === 'parent')!
    const child = nodes.find((n) => n.id === 'child')!
    expect(parent.data.hasChildren).toBe(true)
    expect(parent.data.editedByUser).toBe(false)
    expect(parent.data.contentType).toBeUndefined()
    expect(child.data.hasChildren).toBe(false)
    expect(child.data.editedByUser).toBe(true)
    expect(child.data.summary).toBe('a summary')
    expect(child.data.content).toBe('<p>html body</p>')
    expect(child.data.contentType).toBe('html')
  })

  it('pattern is stored on every node and does not affect structure', () => {
    const tree = [
      makeNode({
        id: 'root',
        children: [makeNode({ id: 'c1' })],
      }),
    ]
    const { nodes: nodesA } = treeToFlowShell(tree, new Set(), noop, 'auto')
    const { nodes: nodesB } = treeToFlowShell(tree, new Set(), noop, 'tech')
    expect(nodesA).toHaveLength(2)
    expect(nodesB).toHaveLength(2)
    expect(nodesA[0]!.data.pattern).toBe('auto')
    expect(nodesB[0]!.data.pattern).toBe('tech')
  })

  it('onToggle is forwarded to flow node data', () => {
    const tree = [makeNode({ id: 'root' })]
    const toggle = vi.fn()
    const { nodes } = treeToFlowShell(tree, new Set(), toggle, 'auto')
    expect(nodes[0]!.data.onToggle).toBe(toggle)
  })
})

describe('computeNodeSize', () => {
  it('short label returns a width within [120, 280] and modest height', () => {
    const size = computeNodeSize({
      label: '短',
      summary: '',
      hasChildren: false,
    })
    expect(size.width).toBeGreaterThanOrEqual(120)
    expect(size.width).toBeLessThanOrEqual(280)
    expect(size.height).toBeGreaterThan(0)
    expect(size.height).toBeLessThanOrEqual(110)
  })

  it('long label grows width up to the 280 cap, never beyond', () => {
    const longLabel = '一个非常长的标题 '.repeat(40).trim()
    const textSize = computeNodeSize({
      label: longLabel,
      summary: '',
      hasChildren: false,
    })
    expect(textSize.width).toBeLessThanOrEqual(280)
    expect(textSize.width).toBeGreaterThan(180)
  })

  it('summary line count widens node up to 280 cap', () => {
    const a = computeNodeSize({
      label: '短',
      summary: '',
      hasChildren: false,
    })
    const b = computeNodeSize({
      label: '短',
      summary: 'X'.repeat(400),
      hasChildren: false,
    })
    expect(b.width).toBeGreaterThanOrEqual(a.width)
    expect(b.width).toBeLessThanOrEqual(280)
  })
})

// ────────────────────────────────────────────────────────────────────
// Stage D — boundary tests for `treeToFlowShell` + `computeNodeSize`.
// Covers the spec's edge-case list:
//  - orphan in collapsedIds
//  - 200-level deep tree
//  - special characters in id
//  - extremely long label / content
//  - multiple roots with deeply nested children
//  - null content for html-typed node
//  - unknown pattern string
//  - collapsedIds containing IDs that don't exist
//  - toggleCollapse forwarding (vi.fn reference equality)
//  - depth defaults / negative / explicit
//  - children: [] vs omitted
// ────────────────────────────────────────────────────────────────────

describe('treeToFlowShell — Stage D boundary cases', () => {
  it('orphan in collapsedIds (id not in tree) is silently ignored', () => {
    const tree = [makeNode({ id: 'root', children: [makeNode({ id: 'c1' })] })]
    // 'ghost' is not in the tree — the walker must not crash.
    const { nodes, edges } = treeToFlowShell(tree, new Set(['ghost']), noop, 'auto')
    expect(nodes.map((n) => n.id).sort()).toEqual(['c1', 'root'])
    expect(edges).toHaveLength(1)
    // No node should be marked collapsed because 'ghost' has no match.
    expect(nodes.every((n) => n.data.collapsed === false)).toBe(true)
  })

  it('200-level deep tree propagates depth without stack overflow', () => {
    // Build a linear chain: 0 → 1 → 2 → ... → 200
    let deepest: MindMapNode = makeNode({ id: 'n200' })
    for (let i = 199; i >= 0; i -= 1) {
      deepest = makeNode({ id: `n${i}`, children: [deepest] })
    }
    const tree: MindMapNode[] = [deepest]
    const { nodes } = treeToFlowShell(tree, new Set(), noop, 'auto')
    expect(nodes).toHaveLength(201)
    const root = nodes.find((n) => n.id === 'n0')!
    const tip = nodes.find((n) => n.id === 'n200')!
    expect(root.data.depth).toBe(0)
    expect(tip.data.depth).toBe(200)
  })

  it('special characters in node id are preserved verbatim and edges match', () => {
    const special = "a/b:c d-é_中文<>?'"
    const tree = [
      makeNode({
        id: 'root',
        children: [makeNode({ id: special })],
      }),
    ]
    const { nodes, edges } = treeToFlowShell(tree, new Set(), noop, 'auto')
    expect(nodes).toHaveLength(2)
    const child = nodes.find((n) => n.id === special)
    expect(child).toBeDefined()
    expect(edges).toHaveLength(1)
    expect(edges[0]?.source).toBe('root')
    expect(edges[0]?.target).toBe(special)
    // Edge id is `${parent}-${child}` — accept the literal
    expect(edges[0]?.id).toBe(`root-${special}`)
  })

  it('extremely long label (10_000 chars) does not crash and is forwarded', () => {
    const longLabel = 'X'.repeat(10_000)
    const tree = [makeNode({ id: 'root', label: longLabel })]
    const { nodes } = treeToFlowShell(tree, new Set(), noop, 'auto')
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.data.label).toBe(longLabel)
  })

  it('extremely long content (1 MB) does not crash; size cap holds', () => {
    const longContent = '<p>' + 'a'.repeat(1_000_000) + '</p>'
    const tree = [
      makeNode({ id: 'root', content: longContent, contentType: 'html' }),
    ]
    const { nodes } = treeToFlowShell(tree, new Set(), noop, 'auto')
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.data.content).toBe(longContent)
    // Width / height caps are enforced by `computeNodeSize`, not by
    // the tree walker; spot-check that the walker doesn't refuse
    // the long content.
    const size = computeNodeSize({
      label: nodes[0]!.data.label,
      summary: nodes[0]!.data.summary,
      hasChildren: false,
    })
    expect(size.width).toBeLessThanOrEqual(280)
    expect(size.height).toBeLessThanOrEqual(110)
  })

  it('multiple roots with deeply nested children: every root has no parent edge', () => {
    const tree: MindMapNode[] = [
      makeNode({
        id: 'r1',
        children: [
          makeNode({
            id: 'r1c1',
            children: [makeNode({ id: 'r1c1c1' })],
          }),
        ],
      }),
      makeNode({
        id: 'r2',
        children: [makeNode({ id: 'r2c1' })],
      }),
    ]
    const { nodes, edges } = treeToFlowShell(tree, new Set(), noop, 'auto')
    expect(nodes).toHaveLength(5)
    // 1 + 1 root edges excluded; 3 child edges (r1→r1c1, r1c1→r1c1c1, r2→r2c1).
    expect(edges).toHaveLength(3)
    expect(edges.filter((e) => e.target === 'r1')).toHaveLength(0)
    expect(edges.filter((e) => e.target === 'r2')).toHaveLength(0)
    // Every non-root has exactly one parent.
    const childIds = ['r1c1', 'r1c1c1', 'r2c1']
    for (const id of childIds) {
      const parents = edges.filter((e) => e.target === id)
      expect(parents).toHaveLength(1)
    }
  })

  it('content: undefined for an html-typed node leaves hasHtml-flavour size neutral', () => {
    // `content: undefined` is the same as not setting content.
    // `computeNodeSize` is the consumer, but the walker should
    // forward undefined verbatim.
    const tree = [makeNode({ id: 'root', contentType: 'html' })]
    const { nodes } = treeToFlowShell(tree, new Set(), noop, 'auto')
    expect(nodes[0]?.data.content).toBeUndefined()
    expect(nodes[0]?.data.contentType).toBe('html')
  })

  it('unknown pattern string is passed through unchanged in data.pattern', () => {
    const tree = [makeNode({ id: 'root' })]
    const { nodes } = treeToFlowShell(tree, new Set(), noop, 'foo-bar-baz')
    expect(nodes[0]?.data.pattern).toBe('foo-bar-baz')
  })

  it('collapsedIds containing IDs that do not exist in the tree is a no-op', () => {
    const tree = [makeNode({ id: 'root', children: [makeNode({ id: 'c1' })] })]
    const { nodes } = treeToFlowShell(
      tree,
      new Set(['zzz', 'yyy', 'xxx']),
      noop,
      'auto',
    )
    // Same shape as a fully expanded tree.
    expect(nodes.map((n) => n.id).sort()).toEqual(['c1', 'root'])
    expect(nodes.every((n) => n.data.collapsed === false)).toBe(true)
  })

  it('toggleCollapse is forwarded to every node data (reference equality)', () => {
    const tree = [
      makeNode({ id: 'r1', children: [makeNode({ id: 'c1' })] }),
      makeNode({ id: 'r2' }),
    ]
    const toggle = vi.fn()
    const { nodes } = treeToFlowShell(tree, new Set(), toggle, 'auto')
    for (const n of nodes) {
      expect(n.data.onToggle).toBe(toggle)
    }
  })

  it('depth argument defaults to 0, accepts negative values, accepts explicit value', () => {
    const tree = [
      makeNode({
        id: 'root',
        children: [makeNode({ id: 'c1', children: [makeNode({ id: 'c2' })] })],
      }),
    ]
    // default depth = 0
    const a = treeToFlowShell(tree, new Set(), noop, 'auto')
    expect(a.nodes.find((n) => n.id === 'root')!.data.depth).toBe(0)
    expect(a.nodes.find((n) => n.id === 'c2')!.data.depth).toBe(2)
    // explicit depth = -1
    const b = treeToFlowShell(tree, new Set(), noop, 'auto', -1)
    expect(b.nodes.find((n) => n.id === 'root')!.data.depth).toBe(-1)
    expect(b.nodes.find((n) => n.id === 'c2')!.data.depth).toBe(1)
    // explicit depth = 5
    const c = treeToFlowShell(tree, new Set(), noop, 'auto', 5)
    expect(c.nodes.find((n) => n.id === 'root')!.data.depth).toBe(5)
    expect(c.nodes.find((n) => n.id === 'c2')!.data.depth).toBe(7)
  })

  it('children: [] vs omitted — same output shape and hasChildren: false', () => {
    const a = makeNode({ id: 'a', children: [] })
    const b = makeNode({ id: 'b' }) // children omitted → defaults to []
    const { nodes: na } = treeToFlowShell([a], new Set(), noop, 'auto')
    const { nodes: nb } = treeToFlowShell([b], new Set(), noop, 'auto')
    expect(na[0]?.data.hasChildren).toBe(false)
    expect(nb[0]?.data.hasChildren).toBe(false)
    // No edges in either case.
    expect(na).toHaveLength(1)
    expect(nb).toHaveLength(1)
  })
})
