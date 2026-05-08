import { describe, it, expect, beforeEach } from 'vitest'
import { useMindmapStore } from '../mindmapStore'

beforeEach(() => {
  useMindmapStore.setState({
    mindmaps: [],
    activeMindmapId: null,
  })
})

describe('mindmapStore', () => {
  it('starts empty', () => {
    const state = useMindmapStore.getState()
    expect(state.mindmaps).toEqual([])
    expect(state.activeMindmapId).toBeNull()
  })

  it('adds a mindmap and sets it active', () => {
    const { addMindmap } = useMindmapStore.getState()
    const mm = addMindmap('React 学习')

    const state = useMindmapStore.getState()
    expect(state.mindmaps).toHaveLength(1)
    expect(state.mindmaps[0]!.title).toBe('React 学习')
    expect(state.mindmaps[0]!.tree).toEqual([])
    expect(state.activeMindmapId).toBe(mm.id)
  })

  it('removes a mindmap', () => {
    const { addMindmap, removeMindmap } = useMindmapStore.getState()
    const mm = addMindmap('Test')
    removeMindmap(mm.id)

    const state = useMindmapStore.getState()
    expect(state.mindmaps).toHaveLength(0)
    expect(state.activeMindmapId).toBeNull()
  })

  it('removes active mindmap and switches to next', () => {
    const { addMindmap, removeMindmap } = useMindmapStore.getState()
    const mm1 = addMindmap('First')
    const mm2 = addMindmap('Second')

    removeMindmap(mm1.id)
    const state = useMindmapStore.getState()
    expect(state.mindmaps).toHaveLength(1)
    expect(state.activeMindmapId).toBe(mm2.id)
  })

  it('updates mindmap tree', () => {
    const { addMindmap, updateMindmapTree } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    const tree = [
      {
        id: 'n1',
        label: 'React',
        summary: '',
        children: [],
        editedByUser: false,
      },
    ]

    updateMindmapTree(mm.id, tree)
    const state = useMindmapStore.getState()
    expect(state.mindmaps[0]!.tree).toEqual(tree)
    expect(state.mindmaps[0]!.updatedAt).toBeGreaterThanOrEqual(mm.createdAt)
  })

  it('updates mindmap title', () => {
    const { addMindmap, updateMindmapTitle } = useMindmapStore.getState()
    const mm = addMindmap('Old Title')
    updateMindmapTitle(mm.id, 'New Title')

    const state = useMindmapStore.getState()
    expect(state.mindmaps[0]!.title).toBe('New Title')
  })

  it('sets active mindmap id', () => {
    const { addMindmap, setActiveMindmapId } = useMindmapStore.getState()
    const mm = addMindmap('Test')
    setActiveMindmapId(null)

    expect(useMindmapStore.getState().activeMindmapId).toBeNull()

    setActiveMindmapId(mm.id)
    expect(useMindmapStore.getState().activeMindmapId).toBe(mm.id)
  })

  it('gets active mindmap', () => {
    const { addMindmap, getActiveMindmap } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    const active = getActiveMindmap()
    expect(active).not.toBeNull()
    expect(active!.id).toBe(mm.id)
  })

  it('returns null for getActiveMindmap when none selected', () => {
    const state = useMindmapStore.getState()
    const active = state.getActiveMindmap()
    expect(active).toBeNull()
  })
})

describe('monitored conversations', () => {
  beforeEach(() => {
    useMindmapStore.setState({
      mindmaps: [],
      activeMindmapId: null,
    })
  })

  it('adds a monitored conversation', () => {
    const { addMindmap, addMonitoredConversation } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    addMonitoredConversation(mm.id, 'conv-1')

    const state = useMindmapStore.getState()
    expect(state.mindmaps[0]!.monitoredConversationIds).toContain('conv-1')
  })

  it('does not add duplicate monitored conversations', () => {
    const { addMindmap, addMonitoredConversation } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    addMonitoredConversation(mm.id, 'conv-1')
    addMonitoredConversation(mm.id, 'conv-1')

    const state = useMindmapStore.getState()
    expect(state.mindmaps[0]!.monitoredConversationIds).toHaveLength(1)
    expect(state.mindmaps[0]!.monitoredConversationIds).toEqual(['conv-1'])
  })

  it('removes a monitored conversation', () => {
    const { addMindmap, addMonitoredConversation, removeMonitoredConversation } =
      useMindmapStore.getState()
    const mm = addMindmap('Test')

    addMonitoredConversation(mm.id, 'conv-1')
    addMonitoredConversation(mm.id, 'conv-2')

    removeMonitoredConversation(mm.id, 'conv-1')

    const state = useMindmapStore.getState()
    expect(state.mindmaps[0]!.monitoredConversationIds).toEqual(['conv-2'])
  })
})
