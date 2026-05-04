import { getDb } from './db'

let warnedUnavailable = false

export function createIndexedDBStorage() {
  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const db = await getDb()
        const record = await db.get('zustand-persist', name)
        return (record as { value?: string } | undefined)?.value ?? null
      } catch {
        if (!warnedUnavailable) {
          console.error('IndexedDB unavailable — running in memory-only mode. Data will not persist across refreshes.')
          warnedUnavailable = true
        }
        return null
      }
    },
    setItem: async (_name: string, _value: string): Promise<void> => {
      try {
        const db = await getDb()
        await db.put('zustand-persist', { name: _name, value: _value })
      } catch {}
    },
    removeItem: async (_name: string): Promise<void> => {
      try {
        const db = await getDb()
        await db.delete('zustand-persist', _name)
      } catch {}
    },
  }
}
