import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'progressive-mindmap'
const DB_VERSION = 5

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
      },
    })
  }
  return dbPromise
}
