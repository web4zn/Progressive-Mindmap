import { describe, it, expect, beforeEach } from 'vitest'
import { useMindmapStore } from '@/stores/mindmapStore'
import type { MindMap, MindMapNode } from '@/types/mindmap'

/**
 * Tests for the v2 store setters. The earlier `updateNodeShape`
 * setter (and the user-facing "switch shape" submenu) was removed
 * during the mindmap-shell-v2 cleanup because the non-rect variants
 * hid body content; this file keeps the position-related coverage
 * and drops the shape-switching coverage.
 *
 * The store persists to IndexedDB through a debounced adapter. In
 * happy-dom, IndexedDB is a no-op stub so persistence is a
 * fire-and-forget. The in-memory slice is what we assert against.
 */

const SAMPLE_TREE: MindMapNode[] = [
  {
    id: 'root',
    label: 'Root',
    summary: '',
    children: [
      {
        id: 'a',
        label: 'Alpha',
        summary: '',
        children: [],
        editedByUser: false,
        // v2: pre-existing pinned position — covers the
        // `hasPinnedPosition` UI state.
        position: { x: 42, y: 17 },
      },
      {
        id: 'b',
        label: 'Beta',
        summary: '',
        children: [],
        editedByUser: false,
      },
    ],
    editedByUser: false,
  },
]

function freshMindmap(): MindMap {
  return {
    id: 'mm-shape-test',
    title: 'Position test',
    tree: JSON.parse(JSON.stringify(SAMPLE_TREE)) as MindMapNode[],
    pattern: 'auto',
    monitoredConversationIds: [],
    schemaVersion: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

beforeEach(() => {
  useMindmapStore.setState({ mindmaps: [], activeMindmapId: null })
})

describe('resetNodePosition', () => {
  it('drops the `position` field from a node that has one', () => {
    const m = freshMindmap()
    useMindmapStore.setState({ mindmaps: [m], activeMindmapId: m.id })
    useMindmapStore.getState().resetNodePosition(m.id, 'a')
    const after = useMindmapStore.getState().mindmaps[0]
    expect(after).toBeDefined()
    if (!after) return
    const a = after.tree[0]?.children[0]
    expect(a?.position).toBeUndefined()
  })

  it('is a no-op (but still bumps `updatedAt`) for a node without a pinned position', () => {
    const m = freshMindmap()
    useMindmapStore.setState({ mindmaps: [m], activeMindmapId: m.id })
    const before = useMindmapStore.getState().mindmaps[0]?.updatedAt ?? 0
    useMindmapStore.getState().resetNodePosition(m.id, 'b')
    const after = useMindmapStore.getState().mindmaps[0]
    expect(after).toBeDefined()
    if (!after) return
    const b = after.tree[0]?.children[1]
    expect(b?.position).toBeUndefined()
    expect(b?.editedByUser).toBe(true)
    expect(after.updatedAt).toBeGreaterThanOrEqual(before)
  })
})
