import { describe, it, expect } from 'vitest'
import {
  buildFullMindmapPrompt,
  parseMarkdownToTree,
  parseJsonToTree,
  findEditedNodes,
  mergeEditedNodes,
  mindmapTreeToContext,
  buildHybridContext,
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
    sourceConversationIds: [],
    sourceExcerpts: {},
    editedByUser: edited,
  }
}

describe('buildFullMindmapPrompt', () => {
  it('contains mindmap delimiter markers', () => {
    const prompt = buildFullMindmapPrompt()
    expect(prompt).toContain('<!--MINDMAP-->')
    expect(prompt).toContain('<!--/MINDMAP-->')
  })

  it('contains JSON schema instructions', () => {
    const prompt = buildFullMindmapPrompt()
    expect(prompt).toContain('"nodes"')
    expect(prompt).toContain('"label"')
  })

  it('mentions user-edited nodes preservation', () => {
    const prompt = buildFullMindmapPrompt()
    expect(prompt).toContain('细化它')
  })
})

describe('parseMarkdownToTree', () => {
  it('parses a single root node', () => {
    const md = '# React'
    const tree = parseMarkdownToTree(md)
    expect(tree).toHaveLength(1)
    expect(tree[0]!.label).toBe('React')
  })

  it('parses multiple levels', () => {
    const md = '# React\n## Hooks\n### useState'
    const tree = parseMarkdownToTree(md)
    expect(tree).toHaveLength(1)
    expect(tree[0]!.children).toHaveLength(1)
    expect(tree[0]!.children[0]!.children).toHaveLength(1)
  })

  it('handles separator —— for summary', () => {
    const md = '# React —— A UI library\n## Hooks —— Side effects'
    const tree = parseMarkdownToTree(md)
    expect(tree[0]!.label).toBe('React')
    expect(tree[0]!.summary).toBe('A UI library')
    expect(tree[0]!.children[0]!.label).toBe('Hooks')
    expect(tree[0]!.children[0]!.summary).toBe('Side effects')
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

  it('falls back to markdown for invalid JSON', () => {
    const tree = parseJsonToTree('# React\n## Hooks')
    expect(tree).toHaveLength(1)
    expect(tree[0]!.children).toHaveLength(1)
  })

  it('handles empty JSON gracefully', () => {
    const tree = parseJsonToTree('{}')
    expect(tree).toEqual([])
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

describe('buildHybridContext', () => {
  it('returns original messages when tree is empty', () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }]
    const result = buildHybridContext(messages, [])
    expect(result).toEqual(messages)
  })

  it('prepends mindmap context when tree is non-empty', () => {
    const tree = [makeNode('n1', 'React')]
    const messages = [
      { role: 'user' as const, content: 'Q1' },
      { role: 'assistant' as const, content: 'A1' },
    ]
    const result = buildHybridContext(messages, tree)
    expect(result[0]!.role).toBe('system')
    expect(result[0]!.content).toContain('# React')
  })
})
