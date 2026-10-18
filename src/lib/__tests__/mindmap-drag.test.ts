import { describe, expect, it } from 'vitest'
import { collectSubtreeIds, pickReparentTarget } from '../mindmap-drag'
import type { MindMapNode } from '../../types/mindmap'

function node(id: string, children: MindMapNode[] = []): MindMapNode {
  return { id, label: id, summary: '', children, editedByUser: false }
}

const leaf = node('a1')
const parent = node('a', [leaf])

describe('pickReparentTarget', () => {
  it('returns nothing when the drop does not intersect another node', () => {
    expect(pickReparentTarget([], 'a1', leaf, 'a')).toBe('')
  })

  it('ignores a drop on the dragged node itself', () => {
    expect(pickReparentTarget(['a1'], 'a1', leaf, 'a')).toBe('')
  })

  it('treats a drop back onto the current parent as a reposition, not a re-parent', () => {
    expect(pickReparentTarget(['a'], 'a1', leaf, 'a')).toBe('')
  })

  it('rejects a drop onto a descendant (would create a cycle)', () => {
    expect(pickReparentTarget(['a1'], 'a', parent, undefined)).toBe('')
  })

  it('re-parents onto a valid sibling node', () => {
    expect(pickReparentTarget(['b'], 'a1', leaf, 'a')).toBe('b')
  })

  it('re-parents a root node onto another node', () => {
    expect(pickReparentTarget(['b'], 'a', parent, undefined)).toBe('b')
  })

  it('skips invalid candidates and keeps scanning', () => {
    expect(pickReparentTarget(['a1', 'a', 'b'], 'a1', leaf, 'a')).toBe('b')
  })

  it('honours the intersection order (first valid candidate wins)', () => {
    const other = node('c')
    expect(pickReparentTarget(['c', 'b'], 'a1', leaf, 'a')).toBe('c')
    expect(other.id).toBe('c')
  })

  it('still re-parents when the dragged node is a root and the drop is empty', () => {
    expect(pickReparentTarget([], 'a', parent, undefined)).toBe('')
  })

  it('skips a sibling when the dragged node has no parent id supplied', () => {
    expect(pickReparentTarget(['b'], 'a1', leaf, undefined)).toBe('b')
  })
})

describe('collectSubtreeIds', () => {
  it('includes the node itself first', () => {
    expect(collectSubtreeIds(leaf)).toEqual(['a1'])
  })

  it('walks the whole branch depth-first', () => {
    const grandchild = node('a1a')
    const child = node('a1', [grandchild])
    const root = node('a', [child, node('a2')])
    expect(collectSubtreeIds(root)).toEqual(['a', 'a1', 'a1a', 'a2'])
  })
})
