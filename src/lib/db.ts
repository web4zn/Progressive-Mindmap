import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'progressive-mindmap'
/**
 * Schema versions:
 *   v1 — initial (providers, conversations, messages).
 *   v2 — adds `mindmaps`.
 *   v5 — adds `zustand-persist`.
 *   v6 — adds `mindmap-meta` (a key/value store that records
 *         per-mindmap `schemaVersion` and a global `lastMigratedAt`
 *         timestamp). The v2 shape itself is carried in
 *         `zustand-persist` → `mindmap-store` (the `mindmapStore` is
 *         the canonical owner of mindmap data).
 *
 * v3 / v4 were never used on disk — they are mentioned here for
 * historical reference only.
 */
const DB_VERSION = 6

let dbPromise: Promise<IDBPDatabase> | null = null

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('providers')) {
            db.createObjectStore('providers', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('conversations')) {
            db.createObjectStore('conversations', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('messages')) {
            const store = db.createObjectStore('messages', { keyPath: 'id' })
            store.createIndex('conversationId', 'conversationId', { unique: false })
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('mindmaps')) {
            db.createObjectStore('mindmaps', { keyPath: 'id' })
          }
        }
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains('zustand-persist')) {
            db.createObjectStore('zustand-persist', { keyPath: 'name' })
          }
        }
        if (oldVersion < 6) {
          if (!db.objectStoreNames.contains('mindmap-meta')) {
            // Key/value metadata for migration bookkeeping. Keys are
            // arbitrary strings; values are JSON-serialisable blobs.
            // Reserved keys: `lastMigratedAt`, `schemaVersion`.
            db.createObjectStore('mindmap-meta')
          }
        }
      },
    })
  }
  return dbPromise
}

/**
 * Record the timestamp of the most recent v1→v2 migration run.
 * Stored under the `mindmap-meta` object store. Failures are
 * swallowed — this is best-effort bookkeeping, not a correctness
 * gate.
 */
export async function recordMigrationTimestamp(): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  try {
    const db = await getDb()
    await db.put('mindmap-meta', Date.now(), 'lastMigratedAt')
    await db.put('mindmap-meta', 2, 'schemaVersion')
  } catch (err) {
    console.error('[mindmap-db] failed to record migration timestamp:', err)
  }
}

/**
 * Read the most recent migration timestamp, or `null` if the meta
 * store is missing / the key has never been written.
 */
export async function readMigrationTimestamp(): Promise<number | null> {
  if (typeof indexedDB === 'undefined') return null
  try {
    const db = await getDb()
    const value = await db.get('mindmap-meta', 'lastMigratedAt')
    return typeof value === 'number' ? value : null
  } catch {
    return null
  }
}
