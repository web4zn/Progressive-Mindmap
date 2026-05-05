import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatPage from '../ChatPage'
import { useProviderStore } from '@/stores/providerStore'
import { useConversationStore } from '@/stores/conversationStore'
import { useChatStore } from '@/stores/chatStore'

vi.mock('@/lib/llm-client', () => ({
  createClient: vi.fn(() => ({})),
  streamChatWithRetry: vi.fn(),
  LLMClientError: class LLMClientError extends Error {
    code: string
    retryable: boolean
    constructor(code: string, message: string, retryable = false) {
      super(message)
      this.code = code
      this.retryable = retryable
    }
  },
}))

beforeEach(() => {
  const store: Record<string, string> = {}
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] ?? null)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
    store[key] = value
  })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
    delete store[key]
  })

  useProviderStore.persist.clearStorage()
  useProviderStore.setState({ providers: [], selectedProviderId: null })
  useConversationStore.persist.clearStorage()
  useConversationStore.setState({ conversations: [], activeConversationId: null })
  useChatStore.setState({ isGenerating: false, error: null, abortController: null })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ChatPage rendering states', () => {
  it('renders welcome screen when no providers configured', () => {
    const state = useProviderStore.getState()
    expect(state.providers).toHaveLength(0)
    render(<ChatPage />)
    expect(screen.getByText('欢迎使用 LLM Chat')).toBeTruthy()
    expect(screen.getByText('请配置模型提供商开始 AI 对话')).toBeTruthy()
  })

  it('shows create conversation prompt when providers exist but no active conversation', () => {
    useProviderStore.getState().addProvider({
      name: 'OpenAI',
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      models: [{ id: 'gpt-4o', name: 'GPT-4o', enabled: true }],
    })

    render(<ChatPage />)
    expect(screen.getByText('开始新对话')).toBeTruthy()
  })

  it('renders chat interface when provider and active conversation exist', () => {
    const { addProvider } = useProviderStore.getState()
    addProvider({
      name: 'OpenAI',
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      models: [{ id: 'gpt-4o', name: 'GPT-4o', enabled: true }],
    })

    const { addConversation } = useConversationStore.getState()
    addConversation({ providerId: useProviderStore.getState().providers[0]!.id, modelId: 'gpt-4o' })

    render(<ChatPage />)
    expect(screen.getByText('发送消息开始对话')).toBeTruthy()
    expect(screen.getByPlaceholderText('输入消息开始对话... (Shift+Enter 换行)')).toBeTruthy()
  })
})
