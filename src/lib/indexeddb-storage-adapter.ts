import { getDb } from './db'

let warnedUnavailable = false
let pageCloseFlushersRegistered = false

/**
 * Register `beforeunload` and `visibilitychange` listeners that flush
 * all pending debounced writes before the page closes or becomes hidden.
 *
 * Without this, any state change that happens within 500 ms of a page
 * refresh / tab close is silently lost — the debounce timer hasn't
 * fired yet and IndexedDB never sees the write. This is the #1 cause
 * of "edges disappear on refresh" because edges are derived from
 * persisted parent-child node relationships.
 *
 * Call this once from the app entry point (e.g. App.tsx or main.tsx)
 * after the IndexedDB adapter is wired into the Zustand stores.
 */
export function registerPageCloseFlushers(): void {
  if (pageCloseFlushersRegistered) return
  pageCloseFlushersRegistered = true

  // `beforeunload` fires when the page is about to unload (refresh /
  // close / navigation away). It's the most reliable signal but some
  // browsers throttle async work in this handler. `pagehide` is the
  // modern, more reliable alternative — we register both for defense
  // in depth.
  const flush = () => {
    void flushPendingWrites()
  }

  window.addEventListener('beforeunload', flush)
  window.addEventListener('pagehide', flush)

  // `visibilitychange` fires when the tab becomes hidden (user
  // switches tabs, locks phone, etc.). We treat this as a
  // best-effort flush so writes aren't lost if the browser
  // eventually discards the hidden page.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushPendingWrites()
    }
  })
}

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
