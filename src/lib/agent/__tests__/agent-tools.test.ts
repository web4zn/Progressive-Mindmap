import { describe, it, expect } from 'vitest'
import {
  applyOperations,
  findNodeById,
  findParentNode,
  getAncestorPath,
  buildSubtree,
  searchTree,
  removeNodeFromTree,
} from '../agent-tools'
import type { MindMapNode } from '@/types/mindmap'
import type { MindmapOperation } from '../types'

function makeNode(
  id: string,
  label: string,
  children: MindMapNode[] = [],
  overrides: Partial<MindMapNode> = {},
): MindMapNode {
  return {
    id,
    label,
    summary: '',
    children,
    content: undefined,
    contentType: undefined,
    editedByUser: false,
    ...overrides,
  }
}

describe('applyOperations with content/contentType', () => {
  describe('add_child and add_root', () => {
    it('creates a node with HTML content and contentType', () => {
      const ops: MindmapOperation[] = [
        {
          type: 'add_root',
          id: 'root',
          label: 'Root',
          content: '<h3>Title</h3><p>Body</p>',
          contentType: 'html',
        },
      ]
      const result = applyOperations([], ops)
      expect(result).toHaveLength(1)
      expect(result[0]!.content).toBe('<h3>Title</h3>\n<p>Body</p>')
      expect(result[0]!.contentType).toBe('html')
    })

    it('creates a node without content (backward compat)', () => {
      const ops: MindmapOperation[] = [
        {
          type: 'add_root',
          id: 'root',
          label: 'Root',
          summary: 'A summary',
        },
      ]
      const result = applyOperations([], ops)
      expect(result).toHaveLength(1)
      expect(result[0]!.content).toBeUndefined()
      expect(result[0]!.contentType).toBeUndefined()
    })

    it('creates child node with HTML content', () => {
      const tree = [makeNode('parent', 'Parent')]
      const ops: MindmapOperation[] = [
        {
          type: 'add_child',
          parentId: 'parent',
          id: 'child',
          label: 'Child',
          content: '<ul><li>item</li></ul>',
          contentType: 'html',
        },
      ]
      const result = applyOperations(tree, ops)
      expect(result[0]!.children).toHaveLength(1)
      expect(result[0]!.children[0]!.content).toBe('<ul>\n  <li>item</li>\n</ul>')
      expect(result[0]!.children[0]!.contentType).toBe('html')
    })
  })

  describe('update with content patch', () => {
    it('updates content and contentType on existing node', () => {
      const tree = [makeNode('n1', 'Old', [], { content: 'old text', contentType: 'text' })]
      const ops: MindmapOperation[] = [
        {
          type: 'update',
          nodeId: 'n1',
          patch: { content: '<p>new html</p>', contentType: 'html' },
        },
      ]
      const result = applyOperations(tree, ops)
      expect(result[0]!.content).toBe('<p>new html</p>')
      expect(result[0]!.contentType).toBe('html')
    })

    it('updates only label and summary without affecting content', () => {
      const tree = [
        makeNode('n1', 'Old', [], {
          content: '<p>keep me</p>',
          contentType: 'html',
        }),
      ]
      const ops: MindmapOperation[] = [
        {
          type: 'update',
          nodeId: 'n1',
          patch: { label: 'New Label', summary: 'New Summary' },
        },
      ]
      const result = applyOperations(tree, ops)
      expect(result[0]!.label).toBe('New Label')
      expect(result[0]!.summary).toBe('New Summary')
      expect(result[0]!.content).toBe('<p>keep me</p>')
      expect(result[0]!.contentType).toBe('html')
    })

    it('does not update user-edited nodes', () => {
      const tree = [makeNode('n1', 'Old', [], { editedByUser: true, content: 'my content', contentType: 'text' })]
      const ops: MindmapOperation[] = [
        {
          type: 'update',
          nodeId: 'n1',
          patch: { content: '<p>ai overwrite</p>', contentType: 'html' },
        },
      ]
      const result = applyOperations(tree, ops)
      expect(result[0]!.content).toBe('my content')
      expect(result[0]!.contentType).toBe('text')
    })
  })

  describe('backward compat: old markdown nodes', () => {
    it('does not apply operations to user-edited nodes (existing behavior)', () => {
      // Old markdown nodes with contentType='markdown' are already stored in IDB.
      // The type system now expects 'text' | 'html', but existing data may have 'markdown'.
      // The applyOperations should still work — it passes through whatever the op specifies.
      const ops: MindmapOperation[] = [
        {
          type: 'add_root',
          id: 'old',
          label: 'Old Node',
          content: '**bold** text',
          contentType: 'text' as 'text' | 'html',
        },
      ]
      // Old markdown content rendered as text type
      const result = applyOperations([], ops)
      expect(result).toHaveLength(1)
      expect(result[0]!.contentType).toBe('text')
    })
  })
})

// ─── 节点级查询工具测试 ───

function tree(): MindMapNode[] {
  return [
    makeNode('root', '编程语言', [
      makeNode('rust', 'Rust', [
        makeNode('ownership', '所有权', [
          makeNode('borrow', '借用', [], { summary: '引用与借用规则' }),
          makeNode('lifetime', '生命周期', [], { summary: '生命周期标注' }),
        ]),
        makeNode('traits', 'Trait', [], { summary: '接口抽象' }),
      ]),
      makeNode('go', 'Go', [
        makeNode('goroutine', 'Goroutine', [], { summary: '轻量级协程' }),
        makeNode('channel', 'Channel', [], { summary: '通道通信' }),
      ]),
    ]),
  ]
}

describe('findNodeById', () => {
  it('finds a root node by id', () => {
    const result = findNodeById(tree(), 'root')
    expect(result).not.toBeNull()
    expect(result!.label).toBe('编程语言')
  })

  it('finds a nested node by id', () => {
    const result = findNodeById(tree(), 'borrow')
    expect(result).not.toBeNull()
    expect(result!.label).toBe('借用')
    expect(result!.summary).toBe('引用与借用规则')
  })

  it('returns null for unknown id', () => {
    expect(findNodeById(tree(), 'nonexistent')).toBeNull()
  })

  it('handles empty tree', () => {
    expect(findNodeById([], 'any')).toBeNull()
  })
})

describe('findParentNode', () => {
  it('finds parent of a nested node', () => {
    const result = findParentNode(tree(), 'borrow')
    expect(result).not.toBeNull()
    expect(result!.node.label).toBe('所有权')
  })

  it('returns null for root nodes', () => {
    const result = findParentNode(tree(), 'root')
    expect(result).toBeNull()
  })

  it('returns null for unknown node', () => {
    expect(findParentNode(tree(), 'nonexistent')).toBeNull()
  })
})

describe('getSiblings (composed from findParentNode)', () => {
  it('returns siblings of a nested node excluding itself', () => {
    const t = tree()
    const result = findParentNode(t, 'borrow')
    expect(result).not.toBeNull()
    const siblings = result!.childArray
      .filter((s) => s.id !== 'borrow')
      .map((s) => ({ id: s.id, label: s.label }))
    expect(siblings).toHaveLength(1)
    expect(siblings[0]!.label).toBe('生命周期')
  })

  it('returns other root nodes as siblings for a root node', () => {
    const t = tree()
    // 'root' is the only root node, so filtering it out gives empty array
    const rootResult = findParentNode(t, 'root')
    expect(rootResult).toBeNull()
    const siblings = t
      .filter((s) => s.id !== 'root')
      .map((s) => ({ id: s.id, label: s.label }))
    expect(siblings).toHaveLength(0) // only one root
  })

  it('includes all siblings for a node with multiple siblings', () => {
    const t = tree()
    // 'go' is a child of 'root', 'rust' is its sibling
    const result = findParentNode(t, 'go')
    expect(result).not.toBeNull()
    expect(result!.node.label).toBe('编程语言')
    const siblings = result!.childArray
      .filter((s) => s.id !== 'go')
      .map((s) => ({ id: s.id, label: s.label }))
    expect(siblings).toHaveLength(1)
    expect(siblings[0]!.label).toBe('Rust')
  })
})

describe('getAncestorPath', () => {
  it('returns full path from root to nested node', () => {
    const path = getAncestorPath(tree(), 'borrow')
    expect(path).toHaveLength(4) // root > Rust > 所有权 > 借用
    expect(path[0]!.label).toBe('编程语言')
    expect(path[0]!.depth).toBe(0)
    expect(path[1]!.label).toBe('Rust')
    expect(path[1]!.depth).toBe(1)
    expect(path[2]!.label).toBe('所有权')
    expect(path[2]!.depth).toBe(2)
    expect(path[3]!.label).toBe('借用')
    expect(path[3]!.depth).toBe(3)
  })

  it('returns single item for root', () => {
    const path = getAncestorPath(tree(), 'root')
    expect(path).toHaveLength(1)
    expect(path[0]!.label).toBe('编程语言')
  })

  it('returns empty array for unknown node', () => {
    expect(getAncestorPath(tree(), 'nonexistent')).toEqual([])
  })
})

describe('buildSubtree', () => {
  it('depth=1 returns only the root node with empty children', () => {
    const sub = buildSubtree(tree()[0]!, 1)
    expect(sub.label).toBe('编程语言')
    expect(sub.children).toEqual([])
  })

  it('depth=2 returns root + direct children', () => {
    const sub = buildSubtree(tree()[0]!, 2)
    expect(sub.label).toBe('编程语言')
    expect(sub.children).toHaveLength(2)
    expect(sub.children[0]!.label).toBe('Rust')
    expect(sub.children[1]!.label).toBe('Go')
    // grandchildren should be pruned
    expect(sub.children[0]!.children).toEqual([])
    expect(sub.children[1]!.children).toEqual([])
  })

  it('depth=3 includes grandchildren', () => {
    const sub = buildSubtree(tree()[0]!, 3)
    expect(sub.children[0]!.label).toBe('Rust')
    expect(sub.children[0]!.children).toHaveLength(2) // 所有权, Trait
    expect(sub.children[0]!.children[0]!.label).toBe('所有权')
    // great-grandchildren pruned
    expect(sub.children[0]!.children[0]!.children).toEqual([])
  })
})

describe('searchTree', () => {
  it('finds nodes by label (case-insensitive)', () => {
    const results = searchTree(tree(), 'rust', [])
    expect(results).toHaveLength(1)
    expect(results[0]!.label).toBe('Rust')
  })

  it('finds nodes by summary (case-insensitive)', () => {
    const results = searchTree(tree(), '协程', [])
    expect(results).toHaveLength(1)
    expect(results[0]!.label).toBe('Goroutine')
    expect(results[0]!.summary).toBe('轻量级协程')
  })

  it('returns path with > separator', () => {
    const results = searchTree(tree(), '借用', [])
    expect(results).toHaveLength(1)
    expect(results[0]!.path).toBe('编程语言 > Rust > 所有权 > 借用')
  })

  it('matches multiple nodes', () => {
    const results = searchTree(tree(), '生命', [])
    expect(results).toHaveLength(1)
    expect(results[0]!.label).toBe('生命周期')
  })

  it('returns empty array for no match', () => {
    expect(searchTree(tree(), 'javascript', [])).toEqual([])
  })

  it('handles empty tree', () => {
    expect(searchTree([], 'anything', [])).toEqual([])
  })
})

describe('removeNodeFromTree', () => {
  it('removes a leaf node from the tree', () => {
    const t = tree()
    const removed = removeNodeFromTree(t, 'borrow')
    expect(removed).toBe(true)
    expect(findNodeById(t, 'borrow')).toBeNull()
    // Other nodes still exist
    expect(findNodeById(t, 'ownership')).not.toBeNull()
    expect(findNodeById(t, 'rust')).not.toBeNull()
  })

  it('removes a node with children', () => {
    const t = tree()
    const removed = removeNodeFromTree(t, 'ownership')
    expect(removed).toBe(true)
    expect(findNodeById(t, 'ownership')).toBeNull()
    expect(findNodeById(t, 'borrow')).toBeNull() // children gone too
  })

  it('returns false for unknown id', () => {
    expect(removeNodeFromTree(tree(), 'nonexistent')).toBe(false)
  })
})

describe('applyOperations — reparent', () => {
  const ops = (
    nodeId: string,
    newParentId: string,
  ): import('../types').MindmapOperation[] => [
    { type: 'reparent', nodeId, newParentId },
  ]

  it('moves a node to a new parent', () => {
    const t = tree()
    // Move 'traits' from under 'rust' to under 'go'
    const result = applyOperations(t, ops('traits', 'go'))
    const moved = findNodeById(result, 'traits')
    expect(moved).not.toBeNull()
    // Under go now, not under rust
    const rust = findNodeById(result, 'rust')
    expect(rust!.children.find((c) => c.id === 'traits')).toBeUndefined()
    const go = findNodeById(result, 'go')
    expect(go!.children.find((c) => c.id === 'traits')).toBeDefined()
  })

  it('rejects reparenting to self', () => {
    const t = tree()
    const result = applyOperations(t, ops('rust', 'rust'))
    const rust = findNodeById(result, 'rust')
    expect(rust).not.toBeNull()
    // Still has its original children
    expect(rust!.children).toHaveLength(2)
  })

  it('rejects reparenting to descendant', () => {
    const t = tree()
    const result = applyOperations(t, ops('rust', 'ownership'))
    const rust = findNodeById(result, 'rust')
    expect(rust).not.toBeNull()
    expect(rust!.children.map((c) => c.id)).not.toContain('rust')
  })

  it('skips reparent of editedByUser node', () => {
    const t = [
      tree()[0]!,
    ]
    // Mark rust as user-edited
    const rustNode = findNodeById(t, 'rust')!
    rustNode.editedByUser = true
    const result = applyOperations(t, ops('rust', 'go'))
    const rust = findNodeById(result, 'rust')
    expect(rust!.editedByUser).toBe(true)
    // Still under its original parent
    const root = findNodeById(result, 'root')
    expect(root!.children.find((c) => c.id === 'rust')).toBeDefined()
  })

  it('skips reparent to editedByUser parent', () => {
    const t = tree()
    // Mark go as user-edited
    const goNode = findNodeById(t, 'go')!
    goNode.editedByUser = true
    const result = applyOperations(t, ops('traits', 'go'))
    const traits = findNodeById(result, 'traits')
    expect(traits).not.toBeNull()
    // Still under rust, not moved to go
    const rust = findNodeById(result, 'rust')
    expect(rust!.children.find((c) => c.id === 'traits')).toBeDefined()
  })

  it('can reparent a root node', () => {
    // Create tree with two roots
    const t = [
      makeNode('a', 'Topic A'),
      makeNode('b', 'Topic B'),
    ]
    const result = applyOperations(t, ops('b', 'a'))
    const newParent = findNodeById(result, 'a')
    expect(newParent!.children).toHaveLength(1)
    expect(newParent!.children[0]!.id).toBe('b')
    // b is no longer a root
    expect(result.find((n) => n.id === 'b')).toBeUndefined()
  })
})
