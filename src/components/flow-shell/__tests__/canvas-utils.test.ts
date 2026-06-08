import { describe, it, expect } from 'vitest'
import {
  applyDagreLayout,
  decorateNodes,
  decorateEdges,
  structuralFingerprint,
  resolveBackgroundVariant,
  mergeDecoratedNodes,
  type ShapeFlowNode,
} from '../canvas/flowShellUtils'
import type { FlowNodeData } from '../index'
import type { Edge } from '@xyflow/react'

function makeNode(id: string, overrides: Partial<FlowNodeData> = {}): ShapeFlowNode {
  return {
    id,
    type: 'rect',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      summary: '',
      depth: 0,
      pattern: 'auto',
      editedByUser: false,
      hasChildren: false,
      collapsed: false,
      expanded: false,
      ...overrides,
    },
  } as unknown as ShapeFlowNode
}

describe('applyDagreLayout', () => {
  it('returns the same node set with non-zero positions', () => {
    const nodes: ShapeFlowNode[] = [
      makeNode('a', { hasChildren: true }),
      makeNode('b'),
    ]
    const edges: Edge[] = [{ id: 'a-b', source: 'a', target: 'b' }] as Edge[]
    const { nodes: laid } = applyDagreLayout(nodes, edges, 'dagre-lr')
    expect(laid).toHaveLength(2)
    // At least one node should have a non-zero position (dagre
    // always sets positions). We don't pin a specific value
    // because dagre's algorithm may shift slightly.
    const anyMoved = laid.some((n) => n.position.x !== 0 || n.position.y !== 0)
    expect(anyMoved).toBe(true)
  })

  it('respects the direction flag', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const edges: Edge[] = [{ id: 'a-b', source: 'a', target: 'b' }] as Edge[]
    const lr = applyDagreLayout(nodes, edges, 'dagre-lr')
    const tb = applyDagreLayout(nodes, edges, 'dagre-tb')
    // The two layouts put the b-node in different relative
    // positions. We assert that the two position vectors are
    // not identical.
    const lrPos = lr.nodes[1]?.position
    const tbPos = tb.nodes[1]?.position
    expect(lrPos).toBeDefined()
    expect(tbPos).toBeDefined()
    if (lrPos && tbPos) {
      const equalish =
        Math.abs(lrPos.x - tbPos.x) < 1 && Math.abs(lrPos.y - tbPos.y) < 1
      expect(equalish).toBe(false)
    }
  })
})

describe('decorateNodes', () => {
  it('returns a new array but keeps unchanged nodes by reference', () => {
    const nodes = [
      makeNode('a', { isDimmed: false, isStreaming: false, isSearchMatch: false }),
      makeNode('b', { isDimmed: false, isStreaming: false, isSearchMatch: false }),
    ]
    const out = decorateNodes(nodes, {})
    expect(out).toHaveLength(2)
    // No decorations requested → the data props should match the
    // input's data (so the input reference is returned).
    expect(out[0]).toBe(nodes[0])
    expect(out[1]).toBe(nodes[1])
  })

  it('applies the dimmed flag to the matching node', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const out = decorateNodes(nodes, { dimmedIds: new Set(['a']) })
    expect(out[0]?.data?.isDimmed).toBe(true)
    expect(out[1]?.data?.isDimmed).toBe(false)
  })

  it('applies the search-match flag to the matching node', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const out = decorateNodes(nodes, { searchMatchIds: new Set(['b']) })
    expect(out[0]?.data?.isSearchMatch).toBe(false)
    expect(out[1]?.data?.isSearchMatch).toBe(true)
  })

  it('enables streaming only for depth < 3', () => {
    const nodes = [
      makeNode('a', { depth: 0 }),
      makeNode('b', { depth: 2 }),
      makeNode('c', { depth: 3 }),
      makeNode('d', { depth: 5 }),
    ]
    const out = decorateNodes(nodes, { isStreaming: true })
    expect(out[0]?.data?.isStreaming).toBe(true)
    expect(out[1]?.data?.isStreaming).toBe(true)
    expect(out[2]?.data?.isStreaming).toBe(false)
    expect(out[3]?.data?.isStreaming).toBe(false)
  })

  it('returns the same reference when no decoration changes', () => {
    const nodes = [
      makeNode('a', { isDimmed: true, isStreaming: true, isSearchMatch: false }),
    ]
    const out = decorateNodes(nodes, {
      dimmedIds: new Set(['a']),
      isStreaming: true,
    })
    expect(out[0]).toBe(nodes[0])
  })
})

describe('decorateEdges', () => {
  it('returns the same list when no dimmed set is provided', () => {
    const edges: Edge[] = [{ id: 'e1' } as Edge]
    const out = decorateEdges(edges, undefined)
    expect(out).toEqual(edges)
  })

  it('appends "dimmed" to the className of matching edges', () => {
    const edges: Edge[] = [
      { id: 'e1', className: 'flow-edge-path' } as Edge,
      { id: 'e2' } as Edge,
    ]
    const out = decorateEdges(edges, new Set(['e1']))
    expect(out[0]?.className).toContain('dimmed')
    expect(out[0]?.className).toContain('flow-edge-path')
    expect(out[1]?.className ?? '').not.toContain('dimmed')
  })

  it('preserves a pre-existing className when adding "dimmed"', () => {
    const edges: Edge[] = [{ id: 'e1', className: 'a b' } as Edge]
    const out = decorateEdges(edges, new Set(['e1']))
    expect(out[0]?.className).toBe('a b dimmed')
  })
})

describe('structuralFingerprint', () => {
  it('produces the same key for structurally identical inputs', () => {
    const a = [makeNode('a'), makeNode('b')]
    const b = [makeNode('a'), makeNode('b')]
    expect(structuralFingerprint(a, [])).toBe(structuralFingerprint(b, []))
  })

  it('differs when a node is added', () => {
    const a = [makeNode('a')]
    const b = [makeNode('a'), makeNode('b')]
    expect(structuralFingerprint(a, [])).not.toBe(structuralFingerprint(b, []))
  })

  it('differs when an edge is added', () => {
    const a: ShapeFlowNode[] = [makeNode('a'), makeNode('b')]
    const b: ShapeFlowNode[] = [makeNode('a'), makeNode('b')]
    const e1: Edge[] = []
    const e2: Edge[] = [{ id: 'a-b', source: 'a', target: 'b' } as Edge]
    expect(structuralFingerprint(a, e1)).not.toBe(structuralFingerprint(b, e2))
  })

  it('does NOT differ when only the dim flag changes', () => {
    const a = [makeNode('a', { isDimmed: false })]
    const b = [makeNode('a', { isDimmed: true })]
    expect(structuralFingerprint(a, [])).toBe(structuralFingerprint(b, []))
  })
})

describe('resolveBackgroundVariant', () => {
  it('returns null for "none"', () => {
    expect(resolveBackgroundVariant('none')).toBeNull()
  })

  it('returns "dots" for "dots"', () => {
    expect(resolveBackgroundVariant('dots')).toBe('dots')
  })

  it('returns "lines" for "grid"', () => {
    expect(resolveBackgroundVariant('grid')).toBe('lines')
  })
})

describe('mergeDecoratedNodes', () => {
  it('preserves the previous position when decoration flips a flag', () => {
    // The user dragged node 'a' to (123, 456). The decoration
    // pipeline just toggled its `isDimmed` flag. The merged
    // result must keep (123, 456) — otherwise the drag feels
    // "stuck" and snaps back to the dagre value.
    const dragged: ShapeFlowNode = {
      ...makeNode('a', { isDimmed: false }),
      position: { x: 123, y: 456 },
    }
    const decorated: ShapeFlowNode = makeNode('a', { isDimmed: true })
    const merged = mergeDecoratedNodes([dragged], [decorated])
    expect(merged).toHaveLength(1)
    const a = merged[0]
    expect(a).toBeDefined()
    expect(a?.position).toEqual({ x: 123, y: 456 })
    expect(a?.data.isDimmed).toBe(true)
  })

  it('preserves a dragged position when decoration is unchanged', () => {
    const dragged: ShapeFlowNode = {
      ...makeNode('a'),
      position: { x: 7, y: 9 },
    }
    const decorated: ShapeFlowNode = {
      ...makeNode('a'),
      position: { x: 0, y: 0 },
    }
    const merged = mergeDecoratedNodes([dragged], [decorated])
    const a = merged[0]
    expect(a?.position).toEqual({ x: 7, y: 9 })
  })

  it('returns prev by reference when neither data nor position changed', () => {
    const same = [makeNode('a')]
    const merged = mergeDecoratedNodes(same, same)
    expect(merged).toBe(same)
  })

  it('falls back to the decorated position for a brand-new node', () => {
    const prev: ShapeFlowNode[] = []
    const decorated: ShapeFlowNode[] = [
      { ...makeNode('a'), position: { x: 50, y: 60 } },
    ]
    const merged = mergeDecoratedNodes(prev, decorated)
    expect(merged[0]?.position).toEqual({ x: 50, y: 60 })
  })

  it('decorated list is the source of truth — prev nodes with no counterpart are dropped', () => {
    // The decoration pipeline only ever emits nodes that still
    // exist in the tree. If a node is in `prev` but not in
    // `decorated`, that means the structure changed (effect 1
    // will reset everything) — by the time we get here, the
    // `decorated` list is the source of truth. We do NOT try to
    // reconcile deletions here; that is the React Flow
    // `onNodesChange` machinery's job. This test documents that
    // contract.
    const prev: ShapeFlowNode[] = [
      { ...makeNode('a'), position: { x: 1, y: 2 } },
      { ...makeNode('b'), position: { x: 3, y: 4 } },
    ]
    const decorated: ShapeFlowNode[] = [
      { ...makeNode('a'), position: { x: 999, y: 999 } },
    ]
    const merged = mergeDecoratedNodes(prev, decorated)
    expect(merged.map((n) => n.id)).toEqual(['a'])
    expect(merged[0]?.position).toEqual({ x: 1, y: 2 })
  })

  it('reuses the previous node reference when nothing changed (memo-friendly)', () => {
    const a = { ...makeNode('a'), position: { x: 1, y: 1 } } as ShapeFlowNode
    const decorated: ShapeFlowNode = {
      ...a,
      // Same id, same data ref, same position ref → must reuse.
    }
    const merged = mergeDecoratedNodes([a], [decorated])
    expect(merged[0]).toBe(a)
  })
})
