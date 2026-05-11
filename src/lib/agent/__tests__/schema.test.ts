import { describe, it, expect } from 'vitest'
import {
  MindmapOperationSchema,
  OperationsArraySchema,
  validateOperations,
} from '../schema'

describe('MindmapOperationSchema', () => {
  it('accepts a valid add_child operation', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'add_child',
      parentId: 'n1a2b3c',
      id: 'typescript',
      label: 'TypeScript',
      summary: 'JavaScript 的超集',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a valid update operation', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'update',
      nodeId: 'n1a2b3c',
      patch: { summary: '更新后的摘要' },
    })
    expect(result.success).toBe(true)
  })

  it('accepts a valid delete_leaf operation', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'delete_leaf',
      nodeId: 'n1a2b3c',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a valid add_root operation', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'add_root',
      label: 'Python',
      summary: '编程语言',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid operation type', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'invalid_type',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing type field', () => {
    const result = MindmapOperationSchema.safeParse({
      label: 'No type',
    })
    expect(result.success).toBe(false)
  })

  // ── HTML content support ──

  it('accepts add_child with HTML content', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'add_child',
      parentId: 'n1',
      label: 'Topic',
      summary: '摘要',
      content: '<h3>标题</h3><p>段落</p>',
      contentType: 'html',
    })
    expect(result.success).toBe(true)
  })

  it('accepts add_root with content and contentType', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'add_root',
      label: 'Root',
      content: '<p>root content</p>',
      contentType: 'html',
    })
    expect(result.success).toBe(true)
  })

  it('accepts update with content patch', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'update',
      nodeId: 'n1',
      patch: {
        content: '<h3>Updated</h3>',
        contentType: 'html',
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts add_child with text contentType', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'add_child',
      parentId: 'n1',
      label: 'Plain',
      content: 'plain text',
      contentType: 'text',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid contentType value', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'add_child',
      parentId: 'n1',
      label: 'Topic',
      contentType: 'markdown',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid contentType in patch', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'update',
      nodeId: 'n1',
      patch: { contentType: 'xml' },
    })
    expect(result.success).toBe(false)
  })

  it('accepts operations without content fields (backward compat)', () => {
    const result = MindmapOperationSchema.safeParse({
      type: 'add_child',
      parentId: 'n1',
      label: 'No Content',
    })
    expect(result.success).toBe(true)
  })
})

describe('OperationsArraySchema', () => {
  it('accepts an array of valid operations', () => {
    const result = OperationsArraySchema.safeParse([
      { type: 'add_child', parentId: 'n1', label: 'A' },
      { type: 'update', nodeId: 'n2', patch: { summary: 'B' } },
    ])
    expect(result.success).toBe(true)
  })

  it('accepts an empty operations array', () => {
    const result = OperationsArraySchema.safeParse([])
    expect(result.success).toBe(true)
  })

  it('rejects more than 10 operations', () => {
    const ops = Array.from({ length: 11 }, (_, i) => ({
      type: 'add_child' as const,
      parentId: `n${i}`,
      label: `Node ${i}`,
    }))
    const result = OperationsArraySchema.safeParse(ops)
    expect(result.success).toBe(false)
  })

  it('accepts exactly 10 operations', () => {
    const ops = Array.from({ length: 10 }, (_, i) => ({
      type: 'add_child' as const,
      parentId: `n${i}`,
      label: `Node ${i}`,
    }))
    const result = OperationsArraySchema.safeParse(ops)
    expect(result.success).toBe(true)
  })
})

describe('validateOperations', () => {
  it('returns success with parsed data for valid input', () => {
    const result = validateOperations([
      { type: 'add_child', parentId: 'n1', label: 'A', summary: 'B' },
    ])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]!.label).toBe('A')
    }
  })

  it('returns error for invalid input', () => {
    const result = validateOperations([{ type: 'invalid' }])
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('操作校验失败')
    }
  })

  it('returns error for non-array input', () => {
    const result = validateOperations('not an array')
    expect(result.success).toBe(false)
  })

  it('returns success with empty data for empty array', () => {
    const result = validateOperations([])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(0)
    }
  })
})
