import { openDB } from 'idb'
import type { Provider } from '../types/provider'
import type { Conversation } from '../types/conversation'
import type { Message } from '../types/message'
import type { MindMap } from '../types/mindmap'

const DB_NAME = 'progressive-mindmap'
const DB_VERSION = 5

let dbPromise: ReturnType<typeof openDB> | null = null

function getDb() {
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

export async function getAllProviders(): Promise<Provider[]> {
  const db = await getDb()
  return (await db.getAll('providers')) as Provider[]
}

export async function getProviderById(id: string): Promise<Provider | undefined> {
  const db = await getDb()
  return (await db.get('providers', id)) as Provider | undefined
}

export async function addProvider(provider: Provider): Promise<void> {
  const db = await getDb()
  await db.add('providers', provider)
}

export async function updateProvider(provider: Provider): Promise<void> {
  const db = await getDb()
  await db.put('providers', provider)
}

export async function removeProvider(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('providers', id)
}

export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDb()
  return (await db.getAll('conversations')) as Conversation[]
}

export async function getConversationById(id: string): Promise<Conversation | undefined> {
  const db = await getDb()
  return (await db.get('conversations', id)) as Conversation | undefined
}

export async function addConversation(conversation: Conversation): Promise<void> {
  const db = await getDb()
  await db.add('conversations', conversation)
}

export async function updateConversation(conversation: Conversation): Promise<void> {
  const db = await getDb()
  await db.put('conversations', conversation)
}

export async function removeConversation(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('conversations', id)
}

export async function getMessagesByConversationId(conversationId: string): Promise<Message[]> {
  const db = await getDb()
  const index = db.transaction('messages').store.index('conversationId')
  return (await index.getAll(conversationId)) as Message[]
}

export async function addMessage(message: Message): Promise<void> {
  const db = await getDb()
  await db.add('messages', message)
}

export async function updateMessage(message: Message): Promise<void> {
  const db = await getDb()
  await db.put('messages', message)
}

export async function removeMessage(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('messages', id)
}

export async function getAllMindmaps(): Promise<MindMap[]> {
  const db = await getDb()
  return (await db.getAll('mindmaps')) as MindMap[]
}

export async function getMindmapById(id: string): Promise<MindMap | undefined> {
  const db = await getDb()
  return (await db.get('mindmaps', id)) as MindMap | undefined
}

export async function addMindmap(mindmap: MindMap): Promise<void> {
  const db = await getDb()
  await db.add('mindmaps', mindmap)
}

export async function updateMindmap(mindmap: MindMap): Promise<void> {
  const db = await getDb()
  await db.put('mindmaps', mindmap)
}

export async function removeMindmap(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('mindmaps', id)
}

export async function isIndexedDBAvailable(): Promise<boolean> {
  try {
    const testDb = await openDB('__idb_test__', 1, {
      upgrade(db) { db.createObjectStore('test') },
    })
    testDb.close()
    indexedDB.deleteDatabase('__idb_test__')
    return true
  } catch {
    return false
  }
}

export class LocalStorageFallback {
  private prefix = 'pm_'

  async getAllProviders(): Promise<Provider[]> {
    const raw = localStorage.getItem(`${this.prefix}providers`)
    return raw ? JSON.parse(raw) : []
  }

  async getProviderById(id: string): Promise<Provider | undefined> {
    return (await this.getAllProviders()).find(p => p.id === id)
  }

  async addProvider(provider: Provider): Promise<void> {
    const providers = await this.getAllProviders()
    providers.push(provider)
    localStorage.setItem(`${this.prefix}providers`, JSON.stringify(providers))
  }

  async updateProvider(provider: Provider): Promise<void> {
    const providers = await this.getAllProviders()
    const idx = providers.findIndex((p: Provider) => p.id === provider.id)
    if (idx !== -1) providers[idx] = provider
    localStorage.setItem(`${this.prefix}providers`, JSON.stringify(providers))
  }

  async removeProvider(id: string): Promise<void> {
    const providers = await this.getAllProviders()
    localStorage.setItem(`${this.prefix}providers`, JSON.stringify(providers.filter((p: Provider) => p.id !== id)))
  }

  async getAllConversations(): Promise<Conversation[]> {
    const raw = localStorage.getItem(`${this.prefix}conversations`)
    return raw ? JSON.parse(raw) : []
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
    return (await this.getAllConversations()).find(c => c.id === id)
  }

  async addConversation(conversation: Conversation): Promise<void> {
    const conversations = await this.getAllConversations()
    conversations.unshift(conversation)
    localStorage.setItem(`${this.prefix}conversations`, JSON.stringify(conversations))
  }

  async updateConversation(conversation: Conversation): Promise<void> {
    const conversations = await this.getAllConversations()
    const idx = conversations.findIndex((c: Conversation) => c.id === conversation.id)
    if (idx !== -1) conversations[idx] = conversation
    localStorage.setItem(`${this.prefix}conversations`, JSON.stringify(conversations))
  }

  async removeConversation(id: string): Promise<void> {
    const conversations = await this.getAllConversations()
    localStorage.setItem(`${this.prefix}conversations`, JSON.stringify(conversations.filter((c: Conversation) => c.id !== id)))
  }

  async getAllMindmaps(): Promise<MindMap[]> {
    const raw = localStorage.getItem(`${this.prefix}mindmaps`)
    return raw ? JSON.parse(raw) : []
  }

  async getMindmapById(id: string): Promise<MindMap | undefined> {
    return (await this.getAllMindmaps()).find(m => m.id === id)
  }

  async addMindmap(mindmap: MindMap): Promise<void> {
    const mindmaps = await this.getAllMindmaps()
    mindmaps.unshift(mindmap)
    localStorage.setItem(`${this.prefix}mindmaps`, JSON.stringify(mindmaps))
  }

  async updateMindmap(mindmap: MindMap): Promise<void> {
    const mindmaps = await this.getAllMindmaps()
    const idx = mindmaps.findIndex((m: MindMap) => m.id === mindmap.id)
    if (idx !== -1) mindmaps[idx] = mindmap
    localStorage.setItem(`${this.prefix}mindmaps`, JSON.stringify(mindmaps))
  }

  async removeMindmap(id: string): Promise<void> {
    const mindmaps = await this.getAllMindmaps()
    localStorage.setItem(`${this.prefix}mindmaps`, JSON.stringify(mindmaps.filter((m: MindMap) => m.id !== id)))
  }
}

type StorageImpl = {
  getAllProviders(): Promise<Provider[]>
  getProviderById(id: string): Promise<Provider | undefined>
  addProvider(provider: Provider): Promise<void>
  updateProvider(provider: Provider): Promise<void>
  removeProvider(id: string): Promise<void>
  getAllConversations(): Promise<Conversation[]>
  getConversationById(id: string): Promise<Conversation | undefined>
  addConversation(conversation: Conversation): Promise<void>
  updateConversation(conversation: Conversation): Promise<void>
  removeConversation(id: string): Promise<void>
  getAllMindmaps(): Promise<MindMap[]>
  getMindmapById(id: string): Promise<MindMap | undefined>
  addMindmap(mindmap: MindMap): Promise<void>
  updateMindmap(mindmap: MindMap): Promise<void>
  removeMindmap(id: string): Promise<void>
}

class IndexedDBStorageAdapter implements StorageImpl {
  getAllProviders = getAllProviders
  getProviderById = getProviderById
  addProvider = addProvider
  updateProvider = updateProvider
  removeProvider = removeProvider
  getAllConversations = getAllConversations
  getConversationById = getConversationById
  addConversation = addConversation
  updateConversation = updateConversation
  removeConversation = removeConversation
  getAllMindmaps = getAllMindmaps
  getMindmapById = getMindmapById
  addMindmap = addMindmap
  updateMindmap = updateMindmap
  removeMindmap = removeMindmap
}

let storageImpl: StorageImpl | null = null

export async function getStorage(): Promise<StorageImpl> {
  if (!storageImpl) {
    storageImpl = (await isIndexedDBAvailable())
      ? new IndexedDBStorageAdapter()
      : new LocalStorageFallback()
  }
  return storageImpl
}

export async function fetchAllProviders(): Promise<Provider[]> {
  const s = await getStorage()
  return s.getAllProviders()
}
