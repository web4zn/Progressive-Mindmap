import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { Provider, Model } from '../types/provider'

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
    baseURL: provider.apiEndpoint.replace(/\/$/, ''),
    apiKey: provider.apiKey,
    dangerouslyAllowBrowser: true,
  })
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

export async function chat(
  client: OpenAI,
  params: {
    model: string
    messages: ChatCompletionMessageParam[]
    signal?: AbortSignal
    useJsonMode?: boolean
  },
): Promise<string> {
  const response = await client.chat.completions.create(
    {
      model: params.model,
      messages: params.messages,
      stream: false,
      ...(params.useJsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    } as OpenAI.Chat.Completions.ChatCompletionCreateParams,
    { signal: params.signal },
  )
  const result = response as OpenAI.Chat.Completions.ChatCompletion
  const msg = result.choices[0]?.message
  return (msg?.content || (msg as { reasoning_content?: string })?.reasoning_content) ?? ''
}

export async function* streamChatWithRetry(
  client: OpenAI,
  params: {
    model: string
    messages: ChatCompletionMessageParam[]
    signal?: AbortSignal
  },
  maxRetries = 1,
): AsyncIterable<string> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      yield* streamChat(client, params)
      return
    } catch (err) {
      lastError = err

      if (err instanceof LLMClientError && !err.retryable) {
        throw err
      }

      if (isAbortError(err)) {
        throw err
      }

      if (err instanceof OpenAI.APIError && err.status && err.status >= 400 && err.status < 500) {
        throw new LLMClientError(`api_error_${err.status}`, err.message, false)
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }

  if (lastError instanceof Error) {
    throw new LLMClientError('max_retries_exceeded', lastError.message, true)
  }
  throw new LLMClientError('unknown_error', 'Unexpected error during streaming')
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
