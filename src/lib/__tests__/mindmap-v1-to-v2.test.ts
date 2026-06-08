import { describe, it, expect, vi } from 'vitest'
import { migrateV1ToV2, migrateV1ToV2All } from '../migration/mindmap-v1-to-v2'
import type { MindMapV1, MindMap, MindMapNode, MindMapNodeV1 } from '../../types/mindmap'
import { MINDMAP_SCHEMA_VERSION } from '../../types/mindmap'

function makeV1(overrides: Partial<MindMapV1> = {}): MindMapV1 {
  return {
    id: overrides.id ?? 'm1',
    title: overrides.title ?? 'Test',
    tree: overrides.tree ?? [],
    pattern: overrides.pattern,
    monitoredConversationIds: overrides.monitoredConversationIds ?? [],
    collapsedNodeIds: overrides.collapsedNodeIds,
    createdAt: overrides.createdAt ?? 1_000,
    updatedAt: overrides.updatedAt ?? 2_000,
  }
}

describe('migrateV1ToV2', () => {
  it('is idempotent on already-v2 input', () => {
    const v2: MindMap = {
      id: 'm1',
      title: 't',
      tree: [],
      monitoredConversationIds: [],
      schemaVersion: MINDMAP_SCHEMA_VERSION,
      createdAt: 1,
      updatedAt: 2,
    }
    expect(migrateV1ToV2(v2)).toBe(v2)
  })

  it('stamps schemaVersion on a v1 mindmap with empty tree', () => {
    const v1 = makeV1()
    const v2 = migrateV1ToV2(v1)
    expect(v2.schemaVersion).toBe(MINDMAP_SCHEMA_VERSION)
    expect(v2.id).toBe('m1')
    expect(v2.title).toBe('Test')
    expect(v2.tree).toEqual([])
  })

  it('preserves pattern, monitoredConversationIds, and collapsedNodeIds', () => {
    const v1 = makeV1({
      pattern: 'tech',
      monitoredConversationIds: ['c1', 'c2'],
      collapsedNodeIds: ['n1', 'n2'],
    })
    const v2 = migrateV1ToV2(v1)
    expect(v2.pattern).toBe('tech')
    expect(v2.monitoredConversationIds).toEqual(['c1', 'c2'])
    expect(v2.collapsedNodeIds).toEqual(['n1', 'n2'])
  })

  it('walks the tree and drops any pre-existing shape field', () => {
    // The v2 mindmap node carries no `shape` field; the migration
    // must drop a `shape` left over from a pre-cleanup v1 client
    // so the persisted payload stays clean.
    const v1 = makeV1({
      tree: [
        {
          id: 'root',
          label: 'Root',
          summary: '',
          // @ts-expect-error — pre-cleanup v1 carried a `shape`
          shape: 'circle',
          children: [
            {
              id: 'child',
              label: 'Child',
              summary: '',
              // @ts-expect-error
              shape: 'chip',
              children: [],
              editedByUser: false,
            },
          ],
          editedByUser: false,
        },
      ],
    })
    const v2 = migrateV1ToV2(v1)
    expect(v2.tree[0]?.shape).toBeUndefined()
    expect(v2.tree[0]?.children[0]?.shape).toBeUndefined()
  })

  it('walks a deep chain without any shape field', () => {
    const chain: MindMapNodeV1[] = []
    let cursor: MindMapNodeV1 | null = null
    for (let i = 0; i < 5; i++) {
      const node: MindMapNodeV1 = {
        id: `n${i}`,
        label: `Node ${i}`,
        summary: '',
        children: [],
        editedByUser: false,
      }
      if (cursor) cursor.children = [node]
      else chain.push(node)
      cursor = node
    }
    const v1 = makeV1({ tree: chain })
    const v2 = migrateV1ToV2(v1)
    let walker: MindMapNode | undefined = v2.tree[0]
    let depth = 0
    while (walker && walker.children.length > 0) {
      walker = walker.children[0]
      depth++
    }
    expect(depth).toBe(4)
    expect(walker?.shape).toBeUndefined()
  })

  it('falls back to "未命名" for empty labels', () => {
    const v1 = makeV1({
      tree: [{ id: 'n1', label: '', summary: '', children: [], editedByUser: false }],
    })
    const v2 = migrateV1ToV2(v1)
    expect(v2.tree[0]?.label).toBe('未命名')
  })

  it('keeps only whitelisted contentType values', () => {
    const v1 = makeV1({
      tree: [
        {
          id: 'n1',
          label: 'A',
          summary: '',
          content: '<p>x</p>',
          contentType: 'html',
          children: [],
          editedByUser: false,
        },
        {
          id: 'n2',
          label: 'B',
          summary: '',
          content: '# md',
          contentType: 'markdown',
          children: [],
          editedByUser: false,
        },
        {
          id: 'n3',
          label: 'C',
          summary: '',
          content: 'text',
          contentType: 'text',
          children: [],
          editedByUser: false,
        },
        {
          id: 'n4',
          label: 'D',
          summary: '',
          content: 'weird',
          // @ts-expect-error — invalid v1 contentType must be dropped on migration
          contentType: 'xml',
          children: [],
          editedByUser: false,
        },
      ],
    })
    const v2 = migrateV1ToV2(v1)
    expect(v2.tree[0]?.contentType).toBe('html')
    expect(v2.tree[1]?.contentType).toBe('markdown')
    expect(v2.tree[2]?.contentType).toBe('text')
    expect(v2.tree[3]?.contentType).toBeUndefined()
  })

  it('coerces missing monitoredConversationIds to []', () => {
    const v1 = makeV1()
    // @ts-expect-error — simulate a corrupt v1 record from a pre-v2 client
    delete v1.monitoredConversationIds
    const v2 = migrateV1ToV2(v1)
    expect(v2.monitoredConversationIds).toEqual([])
  })

  it('treats missing tree as empty', () => {
    const v1 = makeV1()
    // @ts-expect-error — corrupt v1 with no tree at all
    delete v1.tree
    const v2 = migrateV1ToV2(v1)
    expect(v2.tree).toEqual([])
    expect(v2.schemaVersion).toBe(MINDMAP_SCHEMA_VERSION)
  })
})

describe('migrateV1ToV2All', () => {
  it('returns [] for non-array input', () => {
    // @ts-expect-error — corrupt payload
    expect(migrateV1ToV2All(null)).toEqual([])
  })

  it('migrates a mixed list, leaving v2 entries untouched', () => {
    const v2Already: MindMap = {
      id: 'v2',
      title: 'modern',
      tree: [],
      monitoredConversationIds: [],
      schemaVersion: MINDMAP_SCHEMA_VERSION,
      createdAt: 1,
      updatedAt: 2,
    }
    const v1Entry = makeV1({ id: 'v1', title: 'legacy' })
    const result = migrateV1ToV2All([v2Already, v1Entry])
    // The v2 entry must be referentially stable.
    expect(result[0]).toBe(v2Already)
    expect(result[1]?.id).toBe('v1')
    expect(result[1]?.schemaVersion).toBe(MINDMAP_SCHEMA_VERSION)
  })

  it('replaces a malformed entry with a placeholder and logs a warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // @ts-expect-error — pass a non-mindmap object on purpose
    const result = migrateV1ToV2All([{ not: 'a mindmap' }])
    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe('(已迁移:空记录)')
    expect(result[0]?.schemaVersion).toBe(MINDMAP_SCHEMA_VERSION)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
