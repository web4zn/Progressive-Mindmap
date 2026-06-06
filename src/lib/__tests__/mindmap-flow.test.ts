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
      hasHtml: false,
      hasChildren: false,
    })
    expect(size.width).toBeGreaterThanOrEqual(120)
    expect(size.width).toBeLessThanOrEqual(280)
    expect(size.height).toBeGreaterThan(0)
    expect(size.height).toBeLessThan(380)
  })

  it('long label grows width up to the 280/360 cap, never beyond', () => {
    const longLabel = '一个非常长的标题 '.repeat(40).trim()
    const textSize = computeNodeSize({
      label: longLabel,
      summary: '',
      hasHtml: false,
      hasChildren: false,
    })
    expect(textSize.width).toBeLessThanOrEqual(280)
    expect(textSize.width).toBeGreaterThan(180)

    const htmlSize = computeNodeSize({
      label: longLabel,
      summary: '',
      hasHtml: true,
      hasChildren: false,
    })
    expect(htmlSize.width).toBeLessThanOrEqual(360)
    expect(htmlSize.width).toBeGreaterThan(240)
  })

  it('HTML content caps height at 380 and grows with content length', () => {
    const short = computeNodeSize({
      label: 'X',
      summary: '',
      hasHtml: true,
      hasChildren: false,
    })
    const long = computeNodeSize({
      label: 'X',
      summary: '',
      hasHtml: true,
      hasChildren: false,
      contentLength: 4000,
    })
    expect(short.height).toBeLessThanOrEqual(380)
    expect(long.height).toBeLessThanOrEqual(380)
    expect(long.height).toBeGreaterThanOrEqual(short.height)
  })

  it('summary line count widens node up to 280 cap', () => {
    const a = computeNodeSize({
      label: '短',
      summary: '',
      hasHtml: false,
      hasChildren: false,
    })
    const b = computeNodeSize({
      label: '短',
      summary: 'X'.repeat(400),
      hasHtml: false,
      hasChildren: false,
    })
    expect(b.width).toBeGreaterThanOrEqual(a.width)
    expect(b.width).toBeLessThanOrEqual(280)
  })
})
