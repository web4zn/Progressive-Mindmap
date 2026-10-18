import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { Provider, Model } from '../types/provider'
import { normalizeEndpoint, resolveApiKey } from './provider-utils'

export class LLMClientError extends Error {
  code: string
  retryable: boolean

  constructor(code: string, message: string, retryable = false) {
    super(message)
    this.name = 'LLMClientError'
    this.code = code
    this.retryable = retryable
  }
}

export function isAbortError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return true
  if (
    err instanceof Error &&
    'cause' in err &&
    err.cause instanceof Error &&
    err.cause.name === 'AbortError'
  )
    return true
  if (err instanceof OpenAI.APIError) {
    const msg = err.message?.toLowerCase() ?? ''
    if (msg.includes('abort') || msg.includes('cancel')) return true
  }
  return false
}

export function createClient(provider: Pick<Provider, 'apiEndpoint' | 'apiKey'>): OpenAI {
  return new OpenAI({
    baseURL: normalizeEndpoint(provider.apiEndpoint),
    // Local endpoints may legitimately have no key; the SDK requires a
    // non-empty string, so use a placeholder (never persisted).
    apiKey: resolveApiKey(provider.apiEndpoint, provider.apiKey),
    dangerouslyAllowBrowser: true,
  })
}

/**
 * Classify a streaming failure. Retryable = transient transport problems and
 * overload responses (429 / 5xx). Aborts and 4xx are never retryable.
 */
export function isRetryableError(err: unknown): boolean {
  if (isAbortError(err)) return false
  const status = (err as { status?: unknown } | null)?.status
  if (typeof status === 'number') return status === 429 || status >= 500
  if (err instanceof TypeError) return true
  const name = err instanceof Error ? err.name : ''
  return name === 'APIConnectionError' || name === 'APIConnectionTimeoutError'
}

export interface StreamRetryOptions {
  /** Number of retries after the initial attempt (default 2). */
  maxRetries?: number
  /** Backoff delays in ms; `delays.length` also caps the retry count. */
  delaysMs?: number[]
}

const DEFAULT_RETRY_DELAYS_MS = [500, 1000]

/**
 * `streamChat` with a safe retry policy.
 *
 * Retries only happen **before the first batch is yielded**, because retrying
 * after partial output would duplicate text in the UI. Aborts and
 * non-retryable errors (401/404/…) surface immediately.
 */
export async function* streamChatWithRetry(
  client: OpenAI,
  params: {
    model: string
    messages: ChatCompletionMessageParam[]
    signal?: AbortSignal
  },
  options: StreamRetryOptions = {},
): AsyncIterable<string> {
  const delays = options.delaysMs ?? DEFAULT_RETRY_DELAYS_MS
  const maxRetries = Math.min(options.maxRetries ?? delays.length, delays.length)

  for (let attempt = 0; ; attempt++) {
    let yielded = false
    try {
      for await (const batch of streamChat(client, params)) {
        yielded = true
        yield batch
      }
      return
    } catch (err) {
      if (isAbortError(err) || yielded || attempt >= maxRetries || !isRetryableError(err)) {
        throw err
      }
      const delay = delays[attempt] ?? delays[delays.length - 1] ?? 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

export async function* streamChat(
  client: OpenAI,
  params: {
    model: string
    messages: ChatCompletionMessageParam[]
    signal?: AbortSignal
  },
): AsyncIterable<string> {
  const stream = await client.chat.completions.create(
    {
      model: params.model,
      messages: params.messages,
      stream: true,
    },
    { signal: params.signal },
  )

  // 流式 chunk 频繁（中文每个 chunk 1-2 字），攒够一批再 yield，减少外部迭代次数
  const BATCH_SIZE = 50
  let buffer = ''
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (!delta) continue
    buffer += delta
    if (buffer.length >= BATCH_SIZE) {
      yield buffer
      buffer = ''
    }
  }
  // 最终刷新剩余内容
  if (buffer) yield buffer
}

export async function fetchModels(client: OpenAI): Promise<Model[]> {
  try {
    const response = await client.models.list()
    return response.data
      .filter((m) => m.id && m.object === 'model')
      .map((m) => ({
        id: m.id,
        name: m.id,
        enabled: true,
      }))
  } catch (err) {
    if (err instanceof OpenAI.APIError && err.status === 404) {
      throw new LLMClientError(
        'models_not_supported',
        'This provider does not support listing models',
        false,
      )
    }
    throw err
  }
}
