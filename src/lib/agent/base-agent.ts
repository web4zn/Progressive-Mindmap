import { generateText } from 'ai'
import type { AgentStatus } from './types'

// ─── Agent Context ─────────────────────────────────────────────────

/**
 * Context injected into every agent instance.
 * Provides the LLM connection and status reporting channel.
 */
export interface AgentContext {
  /** The AI SDK language model (e.g., openai.chat('gpt-4o')) */
  model: ReturnType<ReturnType<typeof import('@ai-sdk/openai').createOpenAI>['chat']>
  /** System prompt that defines the agent's role and rules */
  systemPrompt: string
  /** Callback to report agent status to the main thread */
  onStatusReport: (status: AgentStatus, message?: string) => void
}

// ─── BaseAgent ─────────────────────────────────────────────────────

/**
 * Base class for all mindmap agents.
 *
 * Encapsulates LLM calling and provides a common interface.
 * Currently a concrete class — when we add more agent types,
 * extract process() as an abstract method.
 */
export class BaseAgent {
  protected ctx: AgentContext

  constructor(ctx: AgentContext) {
    this.ctx = ctx
  }

  /** Human-readable agent name for logging */
  get name(): string {
    return 'MindmapAgent'
  }

  /**
   * Report agent status to the main thread.
   */
  protected reportStatus(status: AgentStatus, message?: string): void {
    this.ctx.onStatusReport(status, message)
  }

  /**
   * Call the LLM with messages and optional tools.
   *
   * This is a thin wrapper around the AI SDK's generateText()
   * that injects the system prompt and handles error reporting.
   */
  protected async callLLM(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    tools?: Record<string, unknown>
  }): Promise<{
    text?: string
    toolCalls?: Array<{ toolName: string; args: unknown; invalid?: boolean }>
    toolResults?: Array<{ toolName: string; output: unknown }>
  }> {
    const result = await generateText({
      model: this.ctx.model,
      system: this.ctx.systemPrompt,
      messages: params.messages,
      tools: params.tools as never,
    })

    return {
      text: result.text,
      toolCalls: result.toolCalls as unknown as
        | Array<{ toolName: string; args: unknown; invalid?: boolean }>
        | undefined,
      toolResults: result.toolResults as unknown as
        | Array<{ toolName: string; output: unknown }>
        | undefined,
    }
  }
}
