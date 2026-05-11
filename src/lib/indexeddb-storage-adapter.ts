import { getDb } from './db'

let warnedUnavailable = false

/**
 * 节流队列：高频 persist 只写最后一次，避免流式回复时频繁 IndexedDB 写入。
 */
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingWrites = new Map<string, { name: string; value: string }>()

function debouncedSetItem(name: string, value: string, delay = 500) {
  pendingWrites.set(name, { name, value })
  const existing = debounceTimers.get(name)
  if (existing) clearTimeout(existing)
  debounceTimers.set(
    name,
    setTimeout(async () => {
      const pending = pendingWrites.get(name)
      if (!pending) return
      debounceTimers.delete(name)
      pendingWrites.delete(name)
      try {
        const db = await getDb()
        await db.put('zustand-persist', { name: pending.name, value: pending.value })
      } catch {
        /* silently ignore */
      }
    }, delay),
  )
}

/** 立即写入所有待处理的 persist。用于测试和页面关闭前刷新。 */
export async function flushPendingWrites(): Promise<void> {
  const entries = [...pendingWrites.entries()]
  pendingWrites.clear()
  for (const [name, { name: key, value }] of entries) {
    const timer = debounceTimers.get(name)
    if (timer) clearTimeout(timer)
    debounceTimers.delete(name)
    try {
      const db = await getDb()
      await db.put('zustand-persist', { name: key, value })
    } catch {
      /* silently ignore */
    }
  }
}

export function createIndexedDBStorage() {
  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const db = await getDb()
        const record = await db.get('zustand-persist', name)
        return (record as { value?: string } | undefined)?.value ?? null
      } catch {
        if (!warnedUnavailable) {
          console.error(
            'IndexedDB unavailable — running in memory-only mode. Data will not persist across refreshes.',
          )
          warnedUnavailable = true
        }
        return null
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      debouncedSetItem(name, value)
    },
    removeItem: async (_name: string): Promise<void> => {
      try {
        const db = await getDb()
        await db.delete('zustand-persist', _name)
      } catch {
        /* IndexedDB delete failed — silently ignore */
      }
    },
  }
}
