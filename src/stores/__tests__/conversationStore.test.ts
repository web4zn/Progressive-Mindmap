import { describe, it, expect, beforeEach } from 'vitest'
import { useConversationStore } from '../conversationStore'

beforeEach(() => {
  useConversationStore.setState({
    conversations: [],
    activeConversationId: null,
  })
})

describe('conversationStore', () => {
  it('starts empty', () => {
    const state = useConversationStore.getState()
    expect(state.conversations).toEqual([])
    expect(state.activeConversationId).toBeNull()
  })

  it('adds a conversation and sets it active', () => {
    const { addConversation } = useConversationStore.getState()
    const conv = addConversation({ providerId: 'p1', modelId: 'gpt-4' })

    const state = useConversationStore.getState()
    expect(state.conversations).toHaveLength(1)
    expect(state.conversations[0]!.title).toBe('新对话')
    expect(state.activeConversationId).toBe(conv.id)
  })

  it('adds a conversation with system prompt', () => {
    const { addConversation } = useConversationStore.getState()
    addConversation({ providerId: 'p1', modelId: 'gpt-4', systemPrompt: 'Be helpful' })

    const state = useConversationStore.getState()
    expect(state.conversations[0]!.systemPrompt).toBe('Be helpful')
  })

  it('addMessageToConversation appends message and auto-generates title', () => {
    const { addConversation, addMessageToConversation } = useConversationStore.getState()
    const conv = addConversation({ providerId: 'p1', modelId: 'gpt-4' })

    addMessageToConversation(conv.id, {
      id: 'm1',
      role: 'user',
      content: 'Hello, who are you?',
      createdAt: Date.now(),
      status: 'complete',
    })

    const state = useConversationStore.getState()
    expect(state.conversations[0]!.messages).toHaveLength(1)
    expect(state.conversations[0]!.messages[0]!.content).toBe('Hello, who are you?')
  })

  it('auto-generates title from first user message', () => {
    const { addConversation, addMessageToConversation } = useConversationStore.getState()
    const conv = addConversation({ providerId: 'p1', modelId: 'gpt-4' })

    addMessageToConversation(conv.id, {
      id: 'm1',
      role: 'user',
      content: 'What is the meaning of life?',
      createdAt: Date.now(),
      status: 'complete',
    })

    const state = useConversationStore.getState()
    const title = state.conversations[0]!.title
    expect(title).toContain('What is the meaning')
  })

  it('updateMessageInConversation modifies message fields', () => {
    const { addConversation, addMessageToConversation, updateMessageInConversation } =
      useConversationStore.getState()
    const conv = addConversation({ providerId: 'p1', modelId: 'gpt-4' })

    addMessageToConversation(conv.id, {
      id: 'm1',
      role: 'assistant',
      content: 'partial',
      createdAt: Date.now(),
      status: 'streaming',
    })

    updateMessageInConversation(conv.id, 'm1', { content: 'full response', status: 'complete' })

    const state = useConversationStore.getState()
    expect(state.conversations[0]!.messages[0]!.content).toBe('full response')
    expect(state.conversations[0]!.messages[0]!.status).toBe('complete')
  })

  it('removeLastAssistantMessage removes only assistant messages at the end', () => {
    const { addConversation, addMessageToConversation, removeLastAssistantMessage } =
      useConversationStore.getState()
    const conv = addConversation({ providerId: 'p1', modelId: 'gpt-4' })

    addMessageToConversation(conv.id, {
      id: 'm1',
      role: 'user',
      content: 'hello',
      createdAt: Date.now(),
      status: 'complete',
    })
    addMessageToConversation(conv.id, {
      id: 'm2',
      role: 'assistant',
      content: 'hi',
      createdAt: Date.now(),
      status: 'complete',
    })

    removeLastAssistantMessage(conv.id)

    const state = useConversationStore.getState()
    expect(state.conversations[0]!.messages).toHaveLength(1)
    expect(state.conversations[0]!.messages[0]!.role).toBe('user')
  })

  it('removes conversation and switches to next', () => {
    const { addConversation, removeConversation } = useConversationStore.getState()
    const c1 = addConversation({ providerId: 'p1', modelId: 'gpt-4' })
    const c2 = addConversation({ providerId: 'p1', modelId: 'gpt-4' })

    removeConversation(c2.id)

    const state = useConversationStore.getState()
    expect(state.conversations).toHaveLength(1)
    expect(state.activeConversationId).toBe(c1.id)
  })
})
