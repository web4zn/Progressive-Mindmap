import { describe, it, expect } from 'vitest'
import {
  buildFullMindmapPrompt,
  parseJsonToTree,
  findEditedNodes,
  mergeEditedNodes,
  mindmapTreeToContext,
} from '../mindmap-generator'
import type { MindMapNode } from '@/types/mindmap'

function makeNode(
  id: string,
  label: string,
  children: MindMapNode[] = [],
  edited = false,
): MindMapNode {
  return {
    id,
    label,
    summary: '',
    children,
    editedByUser: edited,
  }
}

describe('buildFullMindmapPrompt', () => {
  it('contains JSON mode instructions', () => {
    const prompt = buildFullMindmapPrompt()
    expect(prompt).toContain('"answer"')
    expect(prompt).toContain('"mindmap"')
    expect(prompt).toContain('"nodes"')
    expect(prompt).toContain('"label"')
  })

  it('mentions user-edited nodes preservation', () => {
    const prompt = buildFullMindmapPrompt()
    expect(prompt).toContain('[用户编辑]')
  })

  it('includes 5w1h instructions when pattern is 5w1h', () => {
    const prompt = buildFullMindmapPrompt('5w1h')
    expect(prompt).toContain('5W1H')
    expect(prompt).toContain('What')
    expect(prompt).toContain('Why')
    expect(prompt).toContain('How')
  })

  it('includes tech instructions when pattern is tech', () => {
    const prompt = buildFullMindmapPrompt('tech')
    expect(prompt).toContain('技术概念')
    expect(prompt).toContain('核心定义')
    expect(prompt).toContain('使用场景')
  })

  it('includes pros-cons instructions when pattern is pros-cons', () => {
    const prompt = buildFullMindmapPrompt('pros-cons')
    expect(prompt).toContain('优缺点')
    expect(prompt).toContain('优点')
    expect(prompt).toContain('缺点')
  })

  it('no extra instructions for auto pattern', () => {
    const auto = buildFullMindmapPrompt('auto')
    const explicit = buildFullMindmapPrompt()
    expect(auto).toBe(explicit)
  })
})

describe('parseJsonToTree', () => {
  it('parses valid JSON with nodes', () => {
    const json = JSON.stringify({
      nodes: [
        { label: 'React', summary: 'UI library', children: [] },
      ],
    })
    const tree = parseJsonToTree(json)
    expect(tree).toHaveLength(1)
    expect(tree[0]!.label).toBe('React')
  })

  it('parses nested JSON', () => {
    const json = JSON.stringify({
      nodes: [
        {
          label: 'React',
          summary: '',
          children: [
            { label: 'Hooks', summary: '', children: [] },
          ],
        },
      ],
    })
    const tree = parseJsonToTree(json)
    expect(tree[0]!.children).toHaveLength(1)
    expect(tree[0]!.children[0]!.label).toBe('Hooks')
  })

  it('returns empty array for invalid JSON', () => {
    const tree = parseJsonToTree('not json')
    expect(tree).toEqual([])
  })

  it('returns empty array for JSON without nodes', () => {
    const tree = parseJsonToTree('{}')
    expect(tree).toEqual([])
  })

  it('parses deeply nested JSON beyond old 6-depth limit', () => {
    const deepChild: Record<string, unknown> = { label: 'leaf', summary: '', children: [] }
    let node = deepChild
    for (let i = 0; i < 8; i++) {
      node = { label: `L${i}`, summary: '', children: [node] }
    }
    const json = JSON.stringify({ nodes: [node] })
    const tree = parseJsonToTree(json)
    let current = tree[0]!
    let depth = 0
    while (current.children.length > 0) {
      current = current.children[0]!
      depth++
    }
    expect(depth).toBe(8)
  })

  it('preserves more than 10 children per node', () => {
    const children = Array.from({ length: 15 }, (_, i) => ({
      label: `C${i}`,
      summary: '',
      children: [] as unknown[],
    }))
    const json = JSON.stringify({
      nodes: [{ label: 'Root', summary: '', children }],
    })
    const tree = parseJsonToTree(json)
    expect(tree[0]!.children).toHaveLength(15)
  })
})

describe('findEditedNodes / mergeEditedNodes', () => {
  it('findEditedNodes returns empty when none edited', () => {
    const tree = [makeNode('n1', 'A')]
    expect(findEditedNodes(tree)).toEqual([])
  })

  it('findEditedNodes finds recursively', () => {
    const tree = [
      makeNode('n1', 'A', [
        makeNode('n2', 'B', [], true),
      ]),
    ]
    const found = findEditedNodes(tree)
    expect(found).toHaveLength(1)
    expect(found[0]!.id).toBe('n2')
  })

  it('mergeEditedNodes preserves user-edited nodes', () => {
    const oldTree = [makeNode('n1', 'OldLabel', [], true)]
    const newTree = [makeNode('n1', 'NewLabel', [])]
    const merged = mergeEditedNodes(newTree, oldTree)
    expect(merged[0]!.label).toBe('OldLabel')
  })

  it('mergeEditedNodes uses new nodes for non-edited', () => {
    const editedNodes = findEditedNodes([makeNode('n1', 'Old', [], false)])
    const newTree = [makeNode('n1', 'New', [])]
    const merged = mergeEditedNodes(newTree, editedNodes)
    expect(merged[0]!.label).toBe('New')
  })
})

describe('mindmapTreeToContext', () => {
  it('serializes tree to markdown', () => {
    const tree = [makeNode('n1', 'React', [makeNode('n2', 'Hooks')])]
    const result = mindmapTreeToContext(tree)
    expect(result).toContain('# React')
    expect(result).toContain('## Hooks')
  })

  it('marks editedByUser nodes', () => {
    const tree = [makeNode('n1', 'React', [], true)]
    const result = mindmapTreeToContext(tree)
    expect(result).toContain('[用户编辑]')
  })

  it('returns empty string for empty tree', () => {
    expect(mindmapTreeToContext([])).toBe('')
  })
})
