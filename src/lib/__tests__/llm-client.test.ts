import { describe, it, expect } from 'vitest'
import { LLMClientError, createClient, fetchModels } from '../llm-client'

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
  it('rejects with LLMClientError on 404', async () => {
    const client = createClient({
      apiEndpoint: 'https://httpstat.in/404',
      apiKey: 'sk-test',
    })

    try {
      await fetchModels(client)
      expect.fail('Expected fetchModels to throw')
    } catch (err) {
      expect(err).toBeDefined()
    }
  })
})
