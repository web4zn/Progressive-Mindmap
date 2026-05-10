import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseAgent } from '../base-agent'
import type { AgentContext } from '../base-agent'

// Mock the AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

import { generateText } from 'ai'

function createMockContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    model: { provider: 'openai' } as unknown as AgentContext['model'],
    systemPrompt: 'You are a test agent',
    onStatusReport: vi.fn(),
    ...overrides,
  }
}

describe('BaseAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('can be instantiated with a context', () => {
    const ctx = createMockContext()
    const agent = new BaseAgent(ctx)
    expect(agent).toBeInstanceOf(BaseAgent)
    expect(agent.name).toBe('MindmapAgent')
  })

  it('reports status through context callback', () => {
    const onStatusReport = vi.fn()
    const agent = new BaseAgent(createMockContext({ onStatusReport }))

    // Use the protected method via type assertion
    ;(agent as unknown as { reportStatus: BaseAgent['reportStatus'] }).reportStatus(
      'thinking',
      'testing',
    )

    expect(onStatusReport).toHaveBeenCalledWith('thinking', 'testing')
  })

  it('callLLM invokes generateText with correct parameters', async () => {
    const ctx = createMockContext()
    const agent = new BaseAgent(ctx)

    const mockResult = { text: 'Hello', toolCalls: [], toolResults: [] }
    vi.mocked(generateText).mockResolvedValue(mockResult as never)

    const result = await (
      agent as unknown as {
        callLLM: (params: {
          messages: Array<{ role: 'user' | 'assistant'; content: string }>
          tools?: Record<string, unknown>
        }) => Promise<unknown>
      }
    ).callLLM({
      messages: [{ role: 'user', content: 'Hi' }],
    })

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: ctx.model,
        system: ctx.systemPrompt,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    )
    expect(result).toEqual({
      text: 'Hello',
      toolCalls: [],
      toolResults: [],
    })
  })

  it('callLLM passes tools to generateText', async () => {
    const agent = new BaseAgent(createMockContext())
    const mockTools = { readMindmap: {} }

    vi.mocked(generateText).mockResolvedValue({ text: '', toolCalls: [], toolResults: [] } as never)

    await (
      agent as unknown as {
        callLLM: (params: {
          messages: Array<{ role: 'user' | 'assistant'; content: string }>
          tools?: Record<string, unknown>
        }) => Promise<unknown>
      }
    ).callLLM({
      messages: [{ role: 'user', content: 'Test' }],
      tools: mockTools,
    })

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: mockTools,
      }),
    )
  })
})
