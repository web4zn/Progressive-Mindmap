import { describe, it, expect } from 'vitest'
import { mindmapTreeToFlatContext } from '../mindmap-generator'
import type { MindMapNode } from '@/types/mindmap'

function makeNode(
  id: string,
  label: string,
  children: MindMapNode[] = [],
  edited = false,
  summary = '',
): MindMapNode {
  return {
    id,
    label,
    summary,
    children,
    editedByUser: edited,
  }
}

describe('mindmapTreeToFlatContext', () => {
  it('serializes node ids, depth and summaries', () => {
    const tree = [makeNode('n1', 'React', [makeNode('n2', 'Hooks')], false, 'UI library')]
    const result = mindmapTreeToFlatContext(tree)
    expect(result).toContain('[id: n1] React —— UI library')
    expect(result).toContain('  [id: n2] Hooks')
  })

  it('marks user-edited nodes', () => {
    const result = mindmapTreeToFlatContext([makeNode('n1', 'React', [], true)])
    expect(result).toContain('[用户编辑]')
  })

  it('reports the recursive child count', () => {
    const tree = [makeNode('n1', 'React', [makeNode('n2', 'Hooks', [makeNode('n3', 'State')])])]
    const result = mindmapTreeToFlatContext(tree)
    expect(result).toContain('(2 子节点)')
  })

  it('returns a placeholder for an empty tree', () => {
    expect(mindmapTreeToFlatContext([])).toBe('(空白脑图)')
  })

  it('truncates beyond maxNodes', () => {
    const tree = [makeNode('n1', 'A'), makeNode('n2', 'B'), makeNode('n3', 'C')]
    const result = mindmapTreeToFlatContext(tree, 2)
    const lines = result.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[2]).toBe('... (truncated)')
  })
})
