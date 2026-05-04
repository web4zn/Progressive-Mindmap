import { describe, it, expect } from 'vitest'
import {
  parseMarkdownToTree, treeToMarkdown, buildMindmapPrompt, buildSystemPrompt,
  countNodes, maxTreeDepth, validateTree, collectCorpusContent,
  deriveNodeId, buildIncrementalPrompt, parseOperations, buildEditedNodeIdSet, applyOperations
} from '../mindmap-generator'
import type { Conversation, Message } from '@/types'
import type { CorpusEntry, MindMapNode, IncrementalOperation } from '@/types/mindmap'

function makeConversation(title: string, messages: Message[]): Conversation {
  return {
    id: crypto.randomUUID(),
    title,
    providerId: 'p1',
    modelId: 'gpt-4',
    systemPrompt: '',
    messages,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function makeMessage(role: 'user' | 'assistant', content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now(),
    status: 'complete',
  }
}

describe('parseMarkdownToTree', () => {
  it('parses a single root node', () => {
    const md = `# React\nA JavaScript library for building user interfaces.`
    const tree = parseMarkdownToTree(md)
    expect(tree).toHaveLength(1)
    expect(tree[0]!.label).toBe('React')
    expect(tree[0]!.children).toEqual([])
  })

  it('parses multiple levels', () => {
    const md = `# React\n\n## useState —— React 中最基础的状态 Hook\n用于函数组件的状态管理\n\n### Lazy Initialization\n传入函数避免重复计算\n\n## useEffect`
    const tree = parseMarkdownToTree(md)
    expect(tree).toHaveLength(1)
    expect(tree[0]!.label).toBe('React')
    expect(tree[0]!.children).toHaveLength(2)

    const useStateNode = tree[0]!.children[0]!
    expect(useStateNode.label).toBe('useState')
    expect(useStateNode.summary).toBe('React 中最基础的状态 Hook')
    expect(useStateNode.children).toHaveLength(1)
    expect(useStateNode.children[0]!.label).toBe('Lazy Initialization')
  })

  it('parses node label without separator', () => {
    const md = `# React\n## Hooks`
    const tree = parseMarkdownToTree(md)
    expect(tree[0]!.children[0]!.label).toBe('Hooks')
    expect(tree[0]!.children[0]!.summary).toBe('')
  })

  it('handles empty markdown', () => {
    const tree = parseMarkdownToTree('')
    expect(tree).toEqual([])
  })

  it('handles non-header text gracefully', () => {
    const md = `Just some text without headers.\nMore text.`
    const tree = parseMarkdownToTree(md)
    expect(tree).toEqual([])
  })

  it('limits depth to 3 levels', () => {
    const md = `# A\n## B\n### C\n#### D`
    const tree = parseMarkdownToTree(md, undefined, 3)
    expect(tree[0]!.children).toHaveLength(1)
    expect(tree[0]!.children[0]!.children).toHaveLength(1)
    expect(tree[0]!.children[0]!.children[0]!.children).toEqual([])
  })

  it('allows depth 4 when maxDepth=4', () => {
    const md = `# A\n## B\n### C\n#### D`
    const tree = parseMarkdownToTree(md, undefined, 4)
    expect(tree[0]!.children[0]!.children[0]!.children).toHaveLength(1)
    expect(tree[0]!.children[0]!.children[0]!.children[0]!.label).toBe('D')
  })

  it('defaults to depth 3 when maxDepth not specified', () => {
    const md = `# A\n## B\n### C\n#### D`
    const tree = parseMarkdownToTree(md)
    expect(tree[0]!.children[0]!.children[0]!.children).toEqual([])
  })

  it('limits children to 10 per node', () => {
    const md = Array.from({ length: 15 }, (_, i) => `# Root\n## Item${i}`).join('\n')
    const tree = parseMarkdownToTree(md)
    expect(tree[0]!.children.length).toBeLessThanOrEqual(10)
  })
})

describe('treeToMarkdown', () => {
  it('converts a tree back to markdown', () => {
    const node: MindMapNode = {
      id: '1',
      label: 'React',
      summary: '',
      children: [
        {
          id: '2',
          label: 'useState',
          summary: 'A basic hook',
          children: [],
          sourceConversationIds: [],
          sourceExcerpts: {},
          editedByUser: false,
        },
      ],
      sourceConversationIds: [],
      sourceExcerpts: {},
      editedByUser: false,
    }
    const md = treeToMarkdown([node])
    expect(md).toContain('# React')
    expect(md).toContain('## useState')
    expect(md).toContain('A basic hook')
  })

  it('handles empty tree', () => {
    const md = treeToMarkdown([])
    expect(md).toBe('')
  })
})

describe('buildMindmapPrompt', () => {
  it('builds prompt for first generation', () => {
    const conv = makeConversation('Test', [
      makeMessage('user', 'What is React?'),
      makeMessage('assistant', 'React is a library for building UIs.'),
    ])
    const { systemPrompt, userMessage } = buildMindmapPrompt(null, [conv])
    expect(systemPrompt).toContain('知识提取助手')
    expect(userMessage).toContain('[src:')
    expect(userMessage).toContain('What is React?')
    expect(userMessage).toContain('React is a library')
  })

  it('includes existing tree in regeneration prompt', () => {
    const existingNode: MindMapNode = {
      id: '1',
      label: 'React',
      summary: '',
      children: [],
      sourceConversationIds: [],
      sourceExcerpts: {},
      editedByUser: false,
    }
    const conv = makeConversation('New', [
      makeMessage('user', 'What are hooks?'),
      makeMessage('assistant', 'Hooks let you use state in functions.'),
    ])
    const { userMessage } = buildMindmapPrompt([existingNode], [conv])
    expect(userMessage).toContain('现有')
    expect(userMessage).toContain('# React')
    expect(userMessage).toContain('What are hooks?')
  })
})

describe('buildSystemPrompt', () => {
  it('includes few-shot example', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('示例输出')
    expect(prompt).toContain('前端状态管理')
    expect(prompt).toContain('本地状态')
    expect(prompt).toContain('Zustand')
  })

  it('includes quality guidelines', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('优先提取概念性')
    expect(prompt).toContain('宁少勿滥')
  })

  it('reflects configured maxDepth=4', () => {
    const prompt = buildSystemPrompt(undefined, 4)
    expect(prompt).toContain('最大深度为 4 层')
  })

  it('auto mode does not specify hard depth limit', () => {
    const prompt = buildSystemPrompt(undefined, 0)
    expect(prompt).toContain('深度不做硬性限制')
  })
})

describe('countNodes', () => {
  it('counts empty tree as 0', () => {
    expect(countNodes([])).toBe(0)
  })

  it('counts single node', () => {
    const node: MindMapNode = { id: '1', label: 'A', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false }
    expect(countNodes([node])).toBe(1)
  })

  it('counts nested tree', () => {
    const tree: MindMapNode[] = [{
      id: '1', label: 'Root', summary: '', sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false,
      children: [
        { id: '2', label: 'Child1', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false },
        { id: '3', label: 'Child2', summary: '', children: [
          { id: '4', label: 'Grandchild', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false },
        ], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false },
      ],
    }]
    expect(countNodes(tree)).toBe(4)
  })
})

describe('maxTreeDepth', () => {
  it('returns 0 for empty tree', () => {
    expect(maxTreeDepth([])).toBe(0)
  })

  it('returns 1 for single node', () => {
    const node: MindMapNode = { id: '1', label: 'A', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false }
    expect(maxTreeDepth([node])).toBe(1)
  })

  it('returns correct depth for 3-level tree', () => {
    const tree: MindMapNode[] = [{
      id: '1', label: 'L1', summary: '', sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false,
      children: [{
        id: '2', label: 'L2', summary: '', sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false,
        children: [{
          id: '3', label: 'L3', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false,
        }],
      }],
    }]
    expect(maxTreeDepth(tree)).toBe(3)
  })
})

describe('validateTree', () => {
  it('validates clean tree with no warnings', () => {
    const tree: MindMapNode[] = [{
      id: '1', label: 'Root', summary: '', sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false,
      children: [
        { id: '2', label: 'Child', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false },
      ],
    }]
    expect(validateTree(tree)).toEqual([])
  })

  it('detects duplicate nodes at same depth', () => {
    const tree: MindMapNode[] = [{
      id: '1', label: 'Root', summary: '', sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false,
      children: [
        { id: '2', label: 'Same', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false },
        { id: '3', label: 'Same', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false },
      ],
    }]
    const warnings = validateTree(tree)
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some(w => w.type === 'duplicate')).toBe(true)
  })

  it('detects empty label nodes', () => {
    const tree: MindMapNode[] = [{
      id: '1', label: 'Root', summary: '', sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false,
      children: [
        { id: '2', label: '', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false },
      ],
    }]
    const warnings = validateTree(tree)
    expect(warnings.some(w => w.type === 'empty-label')).toBe(true)
  })

  it('detects depth exceeded', () => {
    const deepNode: MindMapNode = { id: '4', label: 'L4', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false }
    const l3: MindMapNode = { id: '3', label: 'L3', summary: '', children: [deepNode], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false }
    const l2: MindMapNode = { id: '2', label: 'L2', summary: '', children: [l3], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false }
    const tree: MindMapNode[] = [{ id: '1', label: 'L1', summary: '', children: [l2], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false }]
    const warnings = validateTree(tree)
    expect(warnings.some(w => w.type === 'depth-exceeded')).toBe(true)
  })

  it('detects breadth exceeded', () => {
    const children = Array.from({ length: 12 }, (_, i) => ({
      id: `c${i}`, label: `Child${i}`, summary: '', children: [],
      sourceConversationIds: [] as string[], sourceExcerpts: {} as Record<string, string>, editedByUser: false,
    }))
    const tree: MindMapNode[] = [{
      id: '1', label: 'Root', summary: '', children, sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false,
    }]
    const warnings = validateTree(tree)
    expect(warnings.some(w => w.type === 'breadth-exceeded')).toBe(true)
  })
})

describe('buildMindmapPrompt with materialContent', () => {
  it('uses materialContent when provided', () => {
    const conv = makeConversation('Test', [
      makeMessage('user', 'What is React?'),
    ])
    const matContent = 'Custom material text content'
    const { userMessage } = buildMindmapPrompt(null, [conv], matContent)
    expect(userMessage).toContain('Custom material text content')
    expect(userMessage).not.toContain('[src:')
  })

  it('falls back to conversations when no materialContent', () => {
    const conv = makeConversation('Test', [
      makeMessage('user', 'What is React?'),
    ])
    const { userMessage } = buildMindmapPrompt(null, [conv])
    expect(userMessage).toContain('What is React?')
    expect(userMessage).toContain('[src:')
  })
})

describe('collectCorpusContent', () => {
  it('empty corpus returns empty content', () => {
    const result = collectCorpusContent([], [])
    expect(result.content).toBe('')
    expect(result.sourceMap.size).toBe(0)
  })

  it('single enabled entry returns its message content', () => {
    const msg = makeMessage('assistant', 'Test content for corpus')
    const conv = makeConversation('Test', [msg])
    const entry: CorpusEntry = {
      id: crypto.randomUUID(),
      messageId: msg.id,
      enabled: true,
      addedAt: Date.now(),
    }
    const result = collectCorpusContent([entry], [conv])
    expect(result.content).toContain('Test content for corpus')
    expect(result.content).toContain('[src:')
    expect(result.sourceMap.size).toBe(1)
  })

  it('disabled entries are skipped', () => {
    const msg = makeMessage('assistant', 'Should not appear')
    const conv = makeConversation('Test', [msg])
    const entry: CorpusEntry = {
      id: crypto.randomUUID(),
      messageId: msg.id,
      enabled: false,
      addedAt: Date.now(),
    }
    const result = collectCorpusContent([entry], [conv])
    expect(result.content).toBe('')
    expect(result.sourceMap.size).toBe(0)
  })

  it('entries with selectedText use selectedText instead of full message', () => {
    const msg = makeMessage('assistant', 'Full message content that is long')
    const conv = makeConversation('Test', [msg])
    const entry: CorpusEntry = {
      id: crypto.randomUUID(),
      messageId: msg.id,
      selectedText: 'Selected text only',
      enabled: true,
      addedAt: Date.now(),
    }
    const result = collectCorpusContent([entry], [conv])
    expect(result.content).toContain('Selected text only')
    expect(result.content).not.toContain('Full message content')
  })

  it('source deleted (message not found) is skipped', () => {
    const entry: CorpusEntry = {
      id: crypto.randomUUID(),
      messageId: 'nonexistent-message-id',
      enabled: true,
      addedAt: Date.now(),
    }
    const result = collectCorpusContent([entry], [])
    expect(result.content).toBe('')
    expect(result.sourceMap.size).toBe(0)
  })
})

describe('deriveNodeId', () => {
  it('produces deterministic IDs for the same label', () => {
    expect(deriveNodeId('React')).toBe(deriveNodeId('React'))
  })

  it('produces different IDs for different labels', () => {
    expect(deriveNodeId('React')).not.toBe(deriveNodeId('Vue'))
  })

  it('produces different IDs for same label under different parents', () => {
    const idA = deriveNodeId('State', ['Root'])
    const idB = deriveNodeId('State', ['React'])
    expect(idA).not.toBe(idB)
  })

  it('returns a string starting with n followed by alphanumeric chars', () => {
    expect(deriveNodeId('test')).toMatch(/^n[a-z0-9]+$/)
  })
})

describe('buildIncrementalPrompt', () => {
  it('includes system prompt for incremental editing', () => {
    const { systemPrompt } = buildIncrementalPrompt([], [])
    expect(systemPrompt).toContain('增量编辑')
  })

  it('includes existing tree in user message', () => {
    const node: MindMapNode = {
      id: 'n1', label: 'Root', summary: '', children: [],
      sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false,
    }
    const { userMessage } = buildIncrementalPrompt([node], [])
    expect(userMessage).toContain('# Root')
    expect(userMessage).toContain('节点ID映射')
    expect(userMessage).toContain('n1')
  })

  it('includes output format constraints', () => {
    const { userMessage } = buildIncrementalPrompt([], [])
    expect(userMessage).toContain('"analysis"')
    expect(userMessage).toContain('"operations"')
    expect(userMessage).toContain('noop')
  })

  it('uses materialContent when provided', () => {
    const { userMessage } = buildIncrementalPrompt([], [], 'Custom incremental text')
    expect(userMessage).toContain('Custom incremental text')
  })
})

describe('parseOperations', () => {
  it('parses valid JSON with operations', () => {
    const json = JSON.stringify({
      analysis: 'test',
      operations: [
        { op: 'add_child', parent_id: 'p1', node: { label: 'New', summary: 'Desc' } },
        { op: 'update', node_id: 'n1', changes: { label: 'Updated' } },
        { op: 'merge', from_id: 'n2', to_id: 'n3' },
        { op: 'delete_leaf', node_id: 'n4' },
        { op: 'noop' },
      ],
    })
    const result = parseOperations(json)
    expect(result).toHaveLength(5)
    if (result) {
      expect(result[0]).toEqual({ op: 'add_child', parent_id: 'p1', node: { label: 'New', summary: 'Desc' } })
      expect(result[1]).toEqual({ op: 'update', node_id: 'n1', changes: { label: 'Updated' } })
      expect(result[2]).toEqual({ op: 'merge', from_id: 'n2', to_id: 'n3' })
      expect(result[3]).toEqual({ op: 'delete_leaf', node_id: 'n4' })
      expect(result[4]).toEqual({ op: 'noop' })
    }
  })

  it('returns null for invalid JSON', () => {
    expect(parseOperations('not json')).toBeNull()
  })

  it('returns null when operations field is missing', () => {
    expect(parseOperations('{"analysis":"test"}')).toBeNull()
  })

  it('returns null when operations is not an array', () => {
    expect(parseOperations('{"operations":"string"}')).toBeNull()
  })

  it('returns null for add_child missing parent_id', () => {
    const json = JSON.stringify({ operations: [{ op: 'add_child', node: { label: 'X' } }] })
    expect(parseOperations(json)).toBeNull()
  })

  it('returns null for add_child missing node.label', () => {
    const json = JSON.stringify({ operations: [{ op: 'add_child', parent_id: 'p1', node: {} }] })
    expect(parseOperations(json)).toBeNull()
  })

  it('returns null for update missing changes', () => {
    const json = JSON.stringify({ operations: [{ op: 'update', node_id: 'n1' }] })
    expect(parseOperations(json)).toBeNull()
  })

  it('returns null for merge missing from_id', () => {
    const json = JSON.stringify({ operations: [{ op: 'merge', to_id: 'n3' }] })
    expect(parseOperations(json)).toBeNull()
  })

  it('returns null for delete_leaf missing node_id', () => {
    const json = JSON.stringify({ operations: [{ op: 'delete_leaf' }] })
    expect(parseOperations(json)).toBeNull()
  })

  it('returns null for unknown operation type', () => {
    const json = JSON.stringify({ operations: [{ op: 'unknown_op' }] })
    expect(parseOperations(json)).toBeNull()
  })

  it('defaults summary to empty string when missing in add_child', () => {
    const json = JSON.stringify({ operations: [{ op: 'add_child', parent_id: 'p1', node: { label: 'X' } }] })
    const result = parseOperations(json)
    expect(result).toHaveLength(1)
    if (result) {
      expect(result[0]).toEqual({ op: 'add_child', parent_id: 'p1', node: { label: 'X', summary: '' } })
    }
  })
})

describe('buildEditedNodeIdSet', () => {
  it('returns empty set when no nodes are edited', () => {
    const tree: MindMapNode[] = [{
      id: 'n1', label: 'A', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false,
    }]
    expect(buildEditedNodeIdSet(tree)).toEqual(new Set())
  })

  it('returns ID of edited node', () => {
    const tree: MindMapNode[] = [{
      id: 'n1', label: 'A', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: true,
    }]
    expect(buildEditedNodeIdSet(tree)).toEqual(new Set(['n1']))
  })

  it('finds edited nodes recursively', () => {
    const tree: MindMapNode[] = [{
      id: 'n1', label: 'A', summary: '', sourceConversationIds: [], sourceExcerpts: {}, editedByUser: false,
      children: [{
        id: 'n2', label: 'B', summary: '', children: [], sourceConversationIds: [], sourceExcerpts: {}, editedByUser: true,
      }],
    }]
    expect(buildEditedNodeIdSet(tree)).toEqual(new Set(['n2']))
  })
})

describe('applyOperations', () => {
  function makeNode(id: string, label: string, children: MindMapNode[] = [], edited = false): MindMapNode {
    return { id, label, summary: '', children, sourceConversationIds: [], sourceExcerpts: {}, editedByUser: edited }
  }

  describe('add_child', () => {
    it('adds a child to the specified parent', () => {
      const tree = [makeNode('n1', 'Root')]
      const ops: IncrementalOperation[] = [{ op: 'add_child', parent_id: 'n1', node: { label: 'Child', summary: 'A child' } }]
      const { newTree, changes } = applyOperations(tree, ops, new Set())
      expect(newTree[0]!.children).toHaveLength(1)
      expect(newTree[0]!.children[0]!.label).toBe('Child')
      expect(newTree[0]!.children[0]!.summary).toBe('A child')
      expect(changes).toHaveLength(1)
      expect(changes[0]!.op).toBe('add_child')
    })

    it('skips add_child when parent_id does not exist', () => {
      const tree = [makeNode('n1', 'Root')]
      const ops: IncrementalOperation[] = [{ op: 'add_child', parent_id: 'nonexistent', node: { label: 'X', summary: '' } }]
      const { newTree, changes } = applyOperations(tree, ops, new Set())
      expect(newTree[0]!.children).toHaveLength(0)
      expect(changes).toHaveLength(0)
    })
  })

  describe('update', () => {
    it('updates label and summary of a node', () => {
      const tree = [makeNode('n1', 'OldLabel', [makeNode('n2', 'Child')])]
      const ops: IncrementalOperation[] = [{ op: 'update', node_id: 'n1', changes: { label: 'NewLabel', summary: 'New summary' } }]
      const { newTree, changes } = applyOperations(tree, ops, new Set())
      expect(newTree[0]!.label).toBe('NewLabel')
      expect(newTree[0]!.summary).toBe('New summary')
      expect(newTree[0]!.children).toHaveLength(1)
      expect(changes).toHaveLength(1)
    })

    it('does not update edited nodes', () => {
      const tree = [makeNode('n1', 'OldLabel', [], true)]
      const ops: IncrementalOperation[] = [{ op: 'update', node_id: 'n1', changes: { label: 'NewLabel' } }]
      const { newTree, changes } = applyOperations(tree, ops, new Set(['n1']))
      expect(newTree[0]!.label).toBe('OldLabel')
      expect(changes).toHaveLength(0)
    })

    it('skips update when node_id does not exist', () => {
      const tree = [makeNode('n1', 'Label')]
      const ops: IncrementalOperation[] = [{ op: 'update', node_id: 'nonexistent', changes: { label: 'X' } }]
      const { newTree, changes } = applyOperations(tree, ops, new Set())
      expect(newTree).toHaveLength(1)
      expect(newTree[0]!.label).toBe('Label')
      expect(changes).toHaveLength(0)
    })
  })

  describe('merge', () => {
    it('merges children from from_id to to_id and removes from_id', () => {
      const childA = makeNode('c1', 'ChildA')
      const childB = makeNode('c2', 'ChildB')
      const tree = [makeNode('n1', 'Source', [childA]), makeNode('n2', 'Target', [childB])]
      const ops: IncrementalOperation[] = [{ op: 'merge', from_id: 'n1', to_id: 'n2' }]
      const { newTree, changes } = applyOperations(tree, ops, new Set())
      expect(newTree).toHaveLength(1)
      expect(newTree[0]!.id).toBe('n2')
      expect(newTree[0]!.children).toHaveLength(2)
      expect(newTree[0]!.children.map(c => c.label).sort()).toEqual(['ChildA', 'ChildB'])
      expect(changes).toHaveLength(1)
    })

    it('skips merge when from_id does not exist', () => {
      const tree = [makeNode('n1', 'Target')]
      const ops: IncrementalOperation[] = [{ op: 'merge', from_id: 'nonexistent', to_id: 'n1' }]
      const { newTree, changes } = applyOperations(tree, ops, new Set())
      expect(newTree).toHaveLength(1)
      expect(changes).toHaveLength(0)
    })
  })

  describe('delete_leaf', () => {
    it('deletes a leaf node', () => {
      const tree = [makeNode('n1', 'Root', [makeNode('n2', 'Leaf')])]
      const ops: IncrementalOperation[] = [{ op: 'delete_leaf', node_id: 'n2' }]
      const { newTree, changes } = applyOperations(tree, ops, new Set())
      expect(newTree[0]!.children).toHaveLength(0)
      expect(changes).toHaveLength(1)
    })

    it('does not delete nodes with children', () => {
      const tree = [makeNode('n1', 'Root', [makeNode('n2', 'Child')])]
      const ops: IncrementalOperation[] = [{ op: 'delete_leaf', node_id: 'n1' }]
      const { newTree, changes } = applyOperations(tree, ops, new Set())
      expect(newTree).toHaveLength(1)
      expect(changes).toHaveLength(0)
    })

    it('does not delete edited nodes', () => {
      const tree = [makeNode('n1', 'Root', [makeNode('n2', 'Leaf', [], true)])]
      const ops: IncrementalOperation[] = [{ op: 'delete_leaf', node_id: 'n2' }]
      const { newTree, changes } = applyOperations(tree, ops, new Set(['n2']))
      expect(newTree[0]!.children).toHaveLength(1)
      expect(changes).toHaveLength(0)
    })

    it('skips delete_leaf when node_id does not exist', () => {
      const tree = [makeNode('n1', 'Root')]
      const ops: IncrementalOperation[] = [{ op: 'delete_leaf', node_id: 'nonexistent' }]
      const { newTree, changes } = applyOperations(tree, ops, new Set())
      expect(newTree).toHaveLength(1)
      expect(changes).toHaveLength(0)
    })
  })

  describe('noop', () => {
    it('skips noop operations', () => {
      const tree = [makeNode('n1', 'Root')]
      const ops: IncrementalOperation[] = [{ op: 'noop' }]
      const { newTree, changes } = applyOperations(tree, ops, new Set())
      expect(newTree).toHaveLength(1)
      expect(changes).toHaveLength(0)
    })
  })

  describe('combinations', () => {
    it('processes multiple operations in sequence', () => {
      const tree = [makeNode('n1', 'Root'), makeNode('n2', 'OldTopic')]
      const ops: IncrementalOperation[] = [
        { op: 'add_child', parent_id: 'n1', node: { label: 'NewChild', summary: '' } },
        { op: 'update', node_id: 'n2', changes: { label: 'UpdatedTopic' } },
        { op: 'noop' },
      ]
      const { newTree, changes } = applyOperations(tree, ops, new Set())
      expect(newTree[0]!.children).toHaveLength(1)
      expect(newTree[0]!.children[0]!.label).toBe('NewChild')
      expect(newTree[1]!.label).toBe('UpdatedTopic')
      expect(changes).toHaveLength(2)
    })
  })
})


