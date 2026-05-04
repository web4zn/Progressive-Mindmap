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
        sourceConversationIds: [],
        sourceExcerpts: {},
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

describe('corpus operations', () => {
  beforeEach(() => {
    useMindmapStore.setState({
      mindmaps: [],
      activeMindmapId: null,
    })
  })

  it('adds a corpus entry', () => {
    const { addMindmap, addCorpusEntry } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    addCorpusEntry(mm.id, {
      id: 'c1',
      messageId: 'msg-1',
      selectedText: undefined as string | undefined,
      enabled: true,
      addedAt: 1000,
    })

    const state = useMindmapStore.getState()
    expect(state.mindmaps[0]!.corpus).toHaveLength(1)
    expect(state.mindmaps[0]!.corpus[0]!.id).toBe('c1')
    expect(state.mindmaps[0]!.corpus[0]!.messageId).toBe('msg-1')
    expect(state.mindmaps[0]!.corpus[0]!.enabled).toBe(true)
    expect(state.mindmaps[0]!.corpus[0]!.addedAt).toBe(1000)
  })

  it('preserves existing corpus entries when adding more', () => {
    const { addMindmap, addCorpusEntry } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    addCorpusEntry(mm.id, {
      id: 'c1', messageId: 'msg-1',
      selectedText: undefined as string | undefined,
      enabled: true,
      addedAt: 1000,
    })
    addCorpusEntry(mm.id, {
      id: 'c2', messageId: 'msg-2',
      selectedText: undefined as string | undefined,
      enabled: true,
      addedAt: 1001,
    })

    const state = useMindmapStore.getState()
    expect(state.mindmaps[0]!.corpus).toHaveLength(2)
    expect(state.mindmaps[0]!.corpus[0]!.id).toBe('c1')
    expect(state.mindmaps[0]!.corpus[1]!.id).toBe('c2')
  })

  it('removes a corpus entry', () => {
    const { addMindmap, addCorpusEntry, removeCorpusEntry } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    addCorpusEntry(mm.id, {
      id: 'c1', messageId: 'msg-1',
      selectedText: undefined as string | undefined,
      enabled: true,
      addedAt: 1000,
    })
    addCorpusEntry(mm.id, {
      id: 'c2', messageId: 'msg-2',
      selectedText: undefined as string | undefined,
      enabled: true,
      addedAt: 1001,
    })

    removeCorpusEntry(mm.id, 'c1')

    const state = useMindmapStore.getState()
    expect(state.mindmaps[0]!.corpus).toHaveLength(1)
    expect(state.mindmaps[0]!.corpus[0]!.id).toBe('c2')
  })

  it('toggles a corpus entry enabled state', () => {
    const { addMindmap, addCorpusEntry, toggleCorpusEntry } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    addCorpusEntry(mm.id, {
      id: 'c1', messageId: 'msg-1',
      selectedText: undefined as string | undefined,
      enabled: true,
      addedAt: 1000,
    })

    toggleCorpusEntry(mm.id, 'c1', false)
    expect(useMindmapStore.getState().mindmaps[0]!.corpus[0]!.enabled).toBe(false)

    toggleCorpusEntry(mm.id, 'c1', true)
    expect(useMindmapStore.getState().mindmaps[0]!.corpus[0]!.enabled).toBe(true)
  })

  it('updates a corpus entry note', () => {
    const { addMindmap, addCorpusEntry, updateCorpusEntryNote } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    addCorpusEntry(mm.id, {
      id: 'c1', messageId: 'msg-1',
      selectedText: undefined as string | undefined,
      enabled: true,
      addedAt: 1000,
    })

    updateCorpusEntryNote(mm.id, 'c1', 'This is a note')
    expect(useMindmapStore.getState().mindmaps[0]!.corpus[0]!.note).toBe('This is a note')
  })

  it('clears all corpus entries', () => {
    const { addMindmap, addCorpusEntry, clearCorpus } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    addCorpusEntry(mm.id, {
      id: 'c1', messageId: 'msg-1',
      selectedText: undefined as string | undefined,
      enabled: true,
      addedAt: 1000,
    })
    addCorpusEntry(mm.id, {
      id: 'c2', messageId: 'msg-2',
      selectedText: undefined as string | undefined,
      enabled: true,
      addedAt: 1001,
    })

    clearCorpus(mm.id)

    expect(useMindmapStore.getState().mindmaps[0]!.corpus).toEqual([])
  })

  it('adds batch corpus entries', () => {
    const { addMindmap, addBatchCorpusEntries } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    addBatchCorpusEntries(mm.id, [
      { id: 'c1', messageId: 'msg-1', selectedText: undefined as string | undefined, enabled: true, addedAt: 1000 },
      { id: 'c2', messageId: 'msg-2', selectedText: undefined as string | undefined, enabled: true, addedAt: 1001 },
      { id: 'c3', messageId: 'msg-3', selectedText: undefined as string | undefined, enabled: true, addedAt: 1002 },
    ])

    const state = useMindmapStore.getState()
    expect(state.mindmaps[0]!.corpus).toHaveLength(3)
    expect(state.mindmaps[0]!.corpus[0]!.id).toBe('c1')
    expect(state.mindmaps[0]!.corpus[1]!.id).toBe('c2')
    expect(state.mindmaps[0]!.corpus[2]!.id).toBe('c3')
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
    const { addMindmap, addMonitoredConversation, removeMonitoredConversation } = useMindmapStore.getState()
    const mm = addMindmap('Test')

    addMonitoredConversation(mm.id, 'conv-1')
    addMonitoredConversation(mm.id, 'conv-2')

    removeMonitoredConversation(mm.id, 'conv-1')

    const state = useMindmapStore.getState()
    expect(state.mindmaps[0]!.monitoredConversationIds).toEqual(['conv-2'])
  })
})
