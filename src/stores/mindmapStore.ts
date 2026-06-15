import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createJSONStorage } from 'zustand/middleware'
import { createIndexedDBStorage, flushPendingWrites } from '@/lib/indexeddb-storage-adapter'
import { recordMigrationTimestamp } from '@/lib/db'
import {
  migrateV1ToV2All,
} from '@/lib/migration/mindmap-v1-to-v2'
import {
  migrateV2ToV3All,
} from '@/lib/migration/mindmap-v2-to-v3'
import {
  MINDMAP_SCHEMA_VERSION,
  type MindMap,
  type MindMapNode,
  type MindMapV1,
} from '../types/mindmap'

/**
 * Persist version history:
 *   1 — initial Zustand persist.
 *   2 — added `updateMindmap` partial setter.
 *   3 — added `setCollapsedNodeIds`.
 *   4 — mindmap-shell-v2: rehydrate-time v1→v2 migration. Old
 *       serialised mindmaps that lack `schemaVersion` are upgraded
 *       in place; the migrated state is then re-persisted.
 */
const PERSIST_VERSION = 4

/** The shape stored under `state.mindmap` inside the persist payload. */
interface PersistedMindMapSlice {
  mindmaps: Array<MindMapV1 | MindMap>
  activeMindmapId: string | null
}

interface MindMapState {
  mindmaps: MindMap[]
  activeMindmapId: string | null
  addMindmap: (title: string, pattern?: string) => MindMap
  removeMindmap: (id: string) => void
  updateMindmapTree: (id: string, tree: MindMapNode[]) => void
  updateMindmapTitle: (id: string, title: string) => void
  /**
   * Stage B: generic partial update on a mindmap's top-level scalar
   * fields (title, pattern, …). Title-only updates are still routed
   * through `updateMindmapTitle` for the existing call sites; this
   * setter exists for the inline-rename flow in `MindMapCombobox` and
   * for any future field that needs the same "set one field, bump
   * updatedAt" semantics.
   */
  updateMindmap: (
    id: string,
    partial: Partial<Pick<MindMap, 'title' | 'pattern'>>,
  ) => void
  setActiveMindmapId: (id: string | null) => void
  getActiveMindmap: () => MindMap | null
  updateNode: (
    mindmapId: string,
    nodeId: string,
    patch: Partial<Pick<MindMapNode, 'label' | 'summary' | 'content' | 'contentType'>>,
  ) => void
  /**
   * Reset a node's pinned position so the dagre layout takes over
   * again. We drop `node.position` rather than setting it to
   * (0, 0) so the dagre pass in `applyDagreLayout` has a clear
   * "unconstrained" signal.
   */
  resetNodePosition: (mindmapId: string, nodeId: string) => void
  addChildNode: (mindmapId: string, parentNodeId: string) => void
  deleteNode: (mindmapId: string, nodeId: string) => void
  moveNode: (mindmapId: string, nodeId: string, direction: 'up' | 'down') => void
  reparentNode: (mindmapId: string, nodeId: string, newParentId: string) => void
  addMonitoredConversation: (mindmapId: string, conversationId: string) => void
  removeMonitoredConversation: (mindmapId: string, conversationId: string) => void
  linkNodeConversation: (mindmapId: string, nodeId: string, conversationId: string) => void
  unlinkNodeConversation: (mindmapId: string, nodeId: string) => void
  setCollapsedNodeIds: (id: string, nodeIds: string[]) => void
}

function findAndUpdateNode(
  nodes: MindMapNode[],
  nodeId: string,
  fn: (node: MindMapNode) => MindMapNode | null,
): MindMapNode[] {
  return nodes
    .map((node) => {
      if (node.id === nodeId) {
        const result = fn(node)
        if (result === null) return null as unknown as MindMapNode
        return result
      }
      if (node.children.length > 0) {
        return { ...node, children: findAndUpdateNode(node.children, nodeId, fn).filter(Boolean) }
      }
      return node
    })
    .filter(Boolean)
}

function findParentAndIndex(
  nodes: MindMapNode[],
  nodeId: string,
): { parent: MindMapNode[]; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (!n) continue
    if (n.id === nodeId) return { parent: nodes, index: i }
    if (n.children.length > 0) {
      const found = findParentAndIndex(n.children, nodeId)
      if (found) return found
    }
  }
  return null
}

function findNodeInTree(nodes: MindMapNode[], id: string): MindMapNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNodeInTree(node.children, id)
    if (found) return found
  }
  return null
}

function isDescendantOf(ancestor: MindMapNode, targetId: string): boolean {
  for (const child of ancestor.children) {
    if (child.id === targetId) return true
    if (isDescendantOf(child, targetId)) return true
  }
  return false
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useMindmapStore = create<MindMapState>()(
  persist(
    (set, get) => ({
      mindmaps: [],
      activeMindmapId: null,

      addMindmap: (title, pattern = 'auto') => {
        const now = Date.now()
        const mindmap: MindMap = {
          id: generateId(),
          title,
          pattern,
          tree: [],
          monitoredConversationIds: [],
          schemaVersion: MINDMAP_SCHEMA_VERSION,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          mindmaps: [mindmap, ...state.mindmaps],
          activeMindmapId: mindmap.id,
        }))
        return mindmap
      },

      removeMindmap: (id) => {
        set((state) => {
          const remaining = state.mindmaps.filter((m) => m.id !== id)
          return {
            mindmaps: remaining,
            activeMindmapId:
              state.activeMindmapId === id ? (remaining[0]?.id ?? null) : state.activeMindmapId,
          }
        })
      },

      updateMindmapTree: (id, tree) => {
        set((state) => ({
          mindmaps: state.mindmaps.map((m) =>
            m.id === id ? { ...m, tree, updatedAt: Date.now() } : m,
          ),
        }))
      },

      updateMindmapTitle: (id, title) => {
        set((state) => ({
          mindmaps: state.mindmaps.map((m) =>
            m.id === id ? { ...m, title, updatedAt: Date.now() } : m,
          ),
        }))
      },

      updateMindmap: (id, partial) => {
        set((state) => ({
          mindmaps: state.mindmaps.map((m) =>
            m.id === id ? { ...m, ...partial, updatedAt: Date.now() } : m,
          ),
        }))
      },

      setActiveMindmapId: (id) => set({ activeMindmapId: id }),

      getActiveMindmap: () => {
        const { mindmaps, activeMindmapId } = get()
        return mindmaps.find((m) => m.id === activeMindmapId) ?? null
      },

      updateNode: (mindmapId, nodeId, patch) => {
        set((state) => ({
          mindmaps: state.mindmaps.map((m) => {
            if (m.id !== mindmapId) return m
            return {
              ...m,
              tree: findAndUpdateNode(m.tree, nodeId, (node) => ({
                ...node,
                ...patch,
                editedByUser: true,
              })),
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      resetNodePosition: (mindmapId, nodeId) => {
        set((state) => ({
          mindmaps: state.mindmaps.map((m) => {
            if (m.id !== mindmapId) return m
            return {
              ...m,
              tree: findAndUpdateNode(m.tree, nodeId, (node) => {
                // Strip the `position` field so the next dagre
                // layout pass can place the node freely. We use
                // destructuring-rest to keep every other field
                // intact; `updatedAt` and `editedByUser` get a
                // touch so the user-edit indicator stays lit.
                const { position: _drop, ...rest } = node
                void _drop
                return {
                  ...rest,
                  editedByUser: true,
                  updatedAt: Date.now(),
                }
              }),
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      addChildNode: (mindmapId, parentNodeId) => {
        const newChild: MindMapNode = {
          id: generateId(),
          label: '新节点',
          summary: '',
          content: '',
          contentType: 'text',
          children: [],
          editedByUser: true,
        }
        set((state) => ({
          mindmaps: state.mindmaps.map((m) => {
            if (m.id !== mindmapId) return m
            return {
              ...m,
              tree: findAndUpdateNode(m.tree, parentNodeId, (node) => ({
                ...node,
                children: [...node.children, newChild],
              })),
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      deleteNode: (mindmapId, nodeId) => {
        set((state) => ({
          mindmaps: state.mindmaps.map((m) => {
            if (m.id !== mindmapId) return m
            return {
              ...m,
              tree: findAndUpdateNode(m.tree, nodeId, () => null),
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      moveNode: (mindmapId, nodeId, direction) => {
        set((state) => {
          const mindmap = state.mindmaps.find((m) => m.id === mindmapId)
          if (!mindmap) return state

          const pos = findParentAndIndex(mindmap.tree, nodeId)
          if (!pos) return state

          const node = pos.parent[pos.index]
          if (!node) return state

          const newTree = JSON.parse(JSON.stringify(mindmap.tree)) as MindMapNode[]
          const newPos = findParentAndIndex(newTree, nodeId)
          if (!newPos) return state

          if (direction === 'up' && newPos.index > 0) {
            const a = newPos.parent[newPos.index]
            const b = newPos.parent[newPos.index - 1]
            if (!a || !b) return state
            newPos.parent[newPos.index] = b
            newPos.parent[newPos.index - 1] = a
          } else if (direction === 'down' && newPos.index < newPos.parent.length - 1) {
            const a = newPos.parent[newPos.index]
            const b = newPos.parent[newPos.index + 1]
            if (!a || !b) return state
            newPos.parent[newPos.index] = b
            newPos.parent[newPos.index + 1] = a
          }

          return {
            mindmaps: state.mindmaps.map((m) =>
              m.id === mindmapId ? { ...m, tree: newTree, updatedAt: Date.now() } : m,
            ),
          }
        })
      },

      reparentNode: (mindmapId, nodeId, newParentId) => {
        set((state) => {
          const mindmap = state.mindmaps.find((m) => m.id === mindmapId)
          if (!mindmap) return state

          const nodePos = findParentAndIndex(mindmap.tree, nodeId)
          const parentPos = findParentAndIndex(mindmap.tree, newParentId)
          if (!nodePos || !parentPos) return state

          const node = nodePos.parent[nodePos.index]
          if (!node) return state

          const parent = findNodeInTree(mindmap.tree, newParentId)
          if (!parent) return state

          if (isDescendantOf(parent, nodeId)) return state
          if (node.id === newParentId) return state

          const newTree = JSON.parse(JSON.stringify(mindmap.tree)) as MindMapNode[]
          const newNodePos = findParentAndIndex(newTree, nodeId)
          if (!newNodePos) return state

          const movedNode = newNodePos.parent[newNodePos.index]
          if (!movedNode) return state

          newNodePos.parent.splice(newNodePos.index, 1)

          const newParent = findNodeInTree(newTree, newParentId)
          if (!newParent) return state
          newParent.children.push(movedNode)

          return {
            mindmaps: state.mindmaps.map((m) =>
              m.id === mindmapId ? { ...m, tree: newTree, updatedAt: Date.now() } : m,
            ),
          }
        })
      },

      addMonitoredConversation: (mindmapId, conversationId) => {
        set((state) => ({
          mindmaps: state.mindmaps.map((m) =>
            m.id === mindmapId
              ? {
                  ...m,
                  monitoredConversationIds: (m.monitoredConversationIds ?? []).includes(
                    conversationId,
                  )
                    ? m.monitoredConversationIds
                    : [...(m.monitoredConversationIds ?? []), conversationId],
                  updatedAt: Date.now(),
                }
              : m,
          ),
        }))
      },

      removeMonitoredConversation: (mindmapId, conversationId) => {
        set((state) => ({
          mindmaps: state.mindmaps.map((m) =>
            m.id === mindmapId
              ? {
                  ...m,
                  monitoredConversationIds: (m.monitoredConversationIds ?? []).filter(
                    (id) => id !== conversationId,
                  ),
                  updatedAt: Date.now(),
                }
              : m,
          ),
        }))
      },

      linkNodeConversation: (mindmapId, nodeId, conversationId) => {
        set((state) => ({
          mindmaps: state.mindmaps.map((m) => {
            if (m.id !== mindmapId) return m
            return {
              ...m,
              tree: findAndUpdateNode(m.tree, nodeId, (node) => ({
                ...node,
                linkedConversationId: conversationId,
              })),
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      unlinkNodeConversation: (mindmapId, nodeId) => {
        set((state) => ({
          mindmaps: state.mindmaps.map((m) => {
            if (m.id !== mindmapId) return m
            return {
              ...m,
              tree: findAndUpdateNode(m.tree, nodeId, (node) => {
                const { linkedConversationId: _drop, ...rest } = node
                void _drop
                return rest
              }),
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      setCollapsedNodeIds: (id, nodeIds) => {
        set((state) => ({
          mindmaps: state.mindmaps.map((m) =>
            m.id === id ? { ...m, collapsedNodeIds: nodeIds, updatedAt: Date.now() } : m,
          ),
        }))
      },
    }),
    {
      name: 'mindmap-store',
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => createIndexedDBStorage()),
      /**
       * mindmap-shell-v2: rehydrate-time migration.
       *
       * Zustand invokes this when the persisted payload's
       * `version` differs from the current one (or when forced by
       * `version: bump`). We use the opportunity to walk the
       * persisted `mindmaps` array and upgrade any v1 entries to v2
       * via `migrateV1ToV2All`.
       *
       * `partialize` is intentionally absent — the entire `state`
        * object is what we persist, and we want the *whole* state to
        * be available to `migrate` (not just the slice we care about).
        *
        * v2 → v3: declaration-only migration. The v3 model adds
        * an optional `linkedConversationId` to `MindMapNode`;
        * since the field is `undefined` by default, existing v2
        * nodes pass through unchanged and only the `schemaVersion`
        * stamp is bumped.
        */
      migrate: (persistedState, _fromVersion) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState
        const slice = persistedState as Partial<PersistedMindMapSlice>
        if (!Array.isArray(slice.mindmaps)) return persistedState

        let mindmaps = migrateV1ToV2All(slice.mindmaps)
        mindmaps = migrateV2ToV3All(mindmaps)

        // Stamping the global schema version on the payload itself is
        // not part of the schema — Zustand uses its own `version`
        // for that — but we want the migration timestamp recorded
        // for debugging. `onRehydrateStorage` below awaits it.
        return { ...slice, mindmaps }
      },
      /**
       * After a successful rehydrate, persist the migrated state
       * back to IDB and record the migration timestamp. We don't
       * await the rehydrate flush here — it runs after the store is
       * usable — but we *do* fire-and-forget the timestamp write so
       * it shows up in `mindmap-meta` for diagnostics.
       */
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('[mindmap-store] rehydrate failed:', error)
          return
        }
        void recordMigrationTimestamp()
        // Best-effort: flush the just-migrated state to IDB so
        // subsequent reloads don't re-run the migration. We ignore
        // the returned promise — debounce guarantees the write will
        // happen within 500 ms.
        void flushPendingWrites()
      },
    },
  ),
)
