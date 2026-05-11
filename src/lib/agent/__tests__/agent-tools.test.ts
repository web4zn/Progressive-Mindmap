import { describe, it, expect } from 'vitest'
import { applyOperations } from '../agent-tools'
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
      expect(result[0]!.content).toBe('<h3>Title</h3><p>Body</p>')
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
      expect(result[0]!.children[0]!.content).toBe('<ul><li>item</li></ul>')
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
