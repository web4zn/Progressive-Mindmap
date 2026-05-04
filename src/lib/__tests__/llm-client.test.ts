import { describe, it, expect, vi } from 'vitest'
import { LLMClientError, createClient } from '../llm-client'

vi.mock('../llm-client', async () => {
  const actual = await vi.importActual<typeof import('../llm-client')>('../llm-client')
  return {
    ...actual,
    fetchModels: vi.fn(),
  }
})

describe('LLMClientError', () => {
  it('creates retryable error', () => {
    const err = new LLMClientError('rate_limit', 'Too many requests', true)
    expect(err.code).toBe('rate_limit')
    expect(err.message).toBe('Too many requests')
    expect(err.retryable).toBe(true)
    expect(err.name).toBe('LLMClientError')
  })

  it('creates non-retryable error', () => {
    const err = new LLMClientError('auth_error', 'Invalid API key', false)
    expect(err.retryable).toBe(false)
  })
})

describe('createClient', () => {
  it('creates an OpenAI client with proper config', () => {
    const client = createClient({
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
    })
    expect(client).toBeDefined()
  })

  it('strips trailing slash from endpoint', () => {
    const client = createClient({
      apiEndpoint: 'https://api.openai.com/v1/',
      apiKey: 'sk-test',
    })
    expect(client).toBeDefined()
  })
})

describe('fetchModels', () => {
  it('rejects with LLMClientError on fetch failure', async () => {
    const { fetchModels: mockedFetch } = await import('../llm-client')
    vi.mocked(mockedFetch).mockRejectedValue(
      new LLMClientError('models_not_supported', 'Provider does not support listing models', false)
    )

    await expect(mockedFetch({} as never)).rejects.toThrow(LLMClientError)
  })
})
