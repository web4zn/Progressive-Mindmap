import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createIndexedDBStorage } from '../indexeddb-storage-adapter'

vi.mock('idb', () => {
  const store = new Map<string, { name: string; value: string }>()
  return {
    openDB: vi.fn().mockResolvedValue({
      get: (_store: string, name: string) => {
        const record = store.get(name)
        return record ?? undefined
      },
      put: (_store: string, record: { name: string; value: string }) => {
        store.set(record.name, record)
      },
      delete: (_store: string, name: string) => {
        store.delete(name)
      },
    }),
  }
})

describe('createIndexedDBStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stores and retrieves a value', async () => {
    const storage = createIndexedDBStorage()
    await storage.setItem('test-key', 'test-value')
    const result = await storage.getItem('test-key')
    expect(result).toBe('test-value')
  })

  it('returns null for missing key', async () => {
    const storage = createIndexedDBStorage()
    const result = await storage.getItem('nonexistent')
    expect(result).toBeNull()
  })

  it('removes a stored value', async () => {
    const storage = createIndexedDBStorage()
    await storage.setItem('test-key', 'test-value')
    await storage.removeItem('test-key')
    const result = await storage.getItem('test-key')
    expect(result).toBeNull()
  })

  it('handles JSON string values', async () => {
    const storage = createIndexedDBStorage()
    const json = JSON.stringify({ state: { mindmaps: [{ id: '1', name: 'test' }] } })
    await storage.setItem('mindmap-store', json)
    const result = await storage.getItem('mindmap-store')
    expect(result).toBe(json)
    expect(JSON.parse(result!)).toEqual({ state: { mindmaps: [{ id: '1', name: 'test' }] } })
  })
})
