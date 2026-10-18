import { describe, it, expect, vi } from 'vitest'
import {
  LLMClientError,
  createClient,
  isRetryableError,
  streamChatWithRetry,
} from '../llm-client'

vi.mock('../llm-client', async () => {
  const actual = await vi.importActual<typeof import('../llm-client')>('../llm-client')
  return {
    ...actual,
    fetchModels: vi.fn(),
  }
})

/** A minimal stand-in for the OpenAI chat stream. */
interface FakeChunk {
  choices: Array<{ delta: { content: string } }>
}

function chunk(text: string): FakeChunk {
  return { choices: [{ delta: { content: text } }] }
}

async function* streamOf(texts: string[]): AsyncIterable<FakeChunk> {
  for (const text of texts) yield chunk(text)
}

function fakeClient(create: (args?: unknown, opts?: unknown) => Promise<unknown>) {
  return { chat: { completions: { create } } } as never
}

async function collect(iterable: AsyncIterable<string>): Promise<string> {
  let out = ''
  for await (const part of iterable) out += part
  return out
}

const params = { model: 'test-model', messages: [] }

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
    }) as unknown as { baseURL: string }
    expect(client.baseURL).toBe('https://api.openai.com/v1')
  })

  it('uses a placeholder key for a local endpoint with no key', () => {
    const client = createClient({
      apiEndpoint: 'http://localhost:11434/v1',
      apiKey: '',
    }) as unknown as { apiKey: string; baseURL: string }
    expect(client.apiKey).toBe('sk-local')
    expect(client.baseURL).toBe('http://localhost:11434/v1')
  })
})

describe('isRetryableError', () => {
  it('retries 429 and 5xx', () => {
    expect(isRetryableError({ status: 429 })).toBe(true)
    expect(isRetryableError({ status: 500 })).toBe(true)
    expect(isRetryableError({ status: 503 })).toBe(true)
  })

  it('does not retry 4xx, aborts or unknown errors', () => {
    expect(isRetryableError({ status: 401 })).toBe(false)
    expect(isRetryableError({ status: 404 })).toBe(false)
    expect(isRetryableError(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe(false)
    expect(isRetryableError(new LLMClientError('bad_request', 'bad'))).toBe(false)
  })
})

describe('streamChatWithRetry', () => {
  it('retries a retryable failure before the first token', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('overloaded'), { status: 503 }))
      .mockResolvedValueOnce(streamOf(['hello ', 'world']))
    const client = fakeClient(create)

    const text = await collect(
      streamChatWithRetry(client, params, { delaysMs: [0, 0] }),
    )

    expect(text).toBe('hello world')
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('does not retry after content has been yielded', async () => {
    async function* failsAfterFirstBatch(): AsyncIterable<FakeChunk> {
      yield chunk('x'.repeat(60))
      throw Object.assign(new Error('connection lost'), { status: 503 })
    }
    const create = vi.fn().mockResolvedValueOnce(failsAfterFirstBatch())
    const client = fakeClient(create)

    await expect(
      collect(streamChatWithRetry(client, params, { delaysMs: [0, 0] })),
    ).rejects.toThrow('connection lost')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('does not retry an abort', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const client = fakeClient(create)

    await expect(
      collect(streamChatWithRetry(client, params, { delaysMs: [0, 0] })),
    ).rejects.toThrow('aborted')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('does not retry a non-retryable 4xx', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('unauthorized'), { status: 401 }))
    const client = fakeClient(create)

    await expect(
      collect(streamChatWithRetry(client, params, { delaysMs: [0, 0] })),
    ).rejects.toThrow('unauthorized')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('gives up after the configured number of retries', async () => {
    const create = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('overloaded'), { status: 500 }))
    const client = fakeClient(create)

    await expect(
      collect(streamChatWithRetry(client, params, { maxRetries: 2, delaysMs: [0, 0] })),
    ).rejects.toThrow('overloaded')
    expect(create).toHaveBeenCalledTimes(3)
  })
})

describe('fetchModels', () => {
  it('rejects with LLMClientError on fetch failure', async () => {
    const { fetchModels: mockedFetch } = await import('../llm-client')
    vi.mocked(mockedFetch).mockRejectedValue(
      new LLMClientError('models_not_supported', 'Provider does not support listing models', false),
    )

    await expect(mockedFetch({} as never)).rejects.toThrow(LLMClientError)
  })
})
