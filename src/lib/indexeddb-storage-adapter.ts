import { getDb } from './db'

export function createIndexedDBStorage() {
  return {
    getItem: async (name: string): Promise<string | null> => {
      const db = await getDb()
      const record = await db.get('zustand-persist', name)
      return (record as { value?: string } | undefined)?.value ?? null
    },
    setItem: async (name: string, value: string): Promise<void> => {
      const db = await getDb()
      await db.put('zustand-persist', { name, value })
    },
    removeItem: async (name: string): Promise<void> => {
      const db = await getDb()
      await db.delete('zustand-persist', name)
    },
  }
}
