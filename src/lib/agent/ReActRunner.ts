import { generateText } from 'ai'

const LOG = '[🧠 ReActRunner]'

/**
 * Tool definition as used by the Vercel AI SDK.
 */
export type ToolSet = Record<string, unknown>

/**
 * Status report callback signature.
 */
export type StatusReporter = (
  status: 'idle' | 'thinking' | 'reading_mindmap' | 'generating_mindmap' | 'complete' | 'error',
  message?: string,
) => void

/**
 * Configuration for the ReActRunner.
 */
export interface ReActRunnerConfig {
  /** The AI SDK language model (may be updated per-message) */
  model: ReturnType<ReturnType<typeof import('@ai-sdk/openai').createOpenAI>['chat']>
  /** System prompt for the agent */
  systemPrompt: string
  /** Tool definitions (AI SDK tool() objects) */
  tools: ToolSet
  /** Status report callback */
  onStatusReport: StatusReporter
  /** Maximum ReAct loop steps (default: 5) */
  maxSteps?: number
}

/**
 * Encapsulates the ReAct (Reasoning + Acting) loop for the mindmap agent.
 *
 * Extracted from agent.worker.ts to separate the reasoning loop from
 * Web Worker message routing. The runner is framework-agnostic — it only
 * depends on the AI SDK's generateText() and a tool set.
 */
export class ReActRunner {
  private config: ReActRunnerConfig

  constructor(config: ReActRunnerConfig) {
    this.config = config
  }

  /**
   * Update the language model (e.g., when a message carries a different model ID).
   */
  setModel(model: ReActRunnerConfig['model']): void {
    this.config.model = model
  }

  /**
   * Update the system prompt.
   */
  setSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt
  }

  /**
   * Run the ReAct loop.
   *
   * @param userPrompt - The user's message / conversation context
   * @returns Final LLM text response (or empty string if only tool calls were made)
   */
  async run(userPrompt: string): Promise<string> {
    const maxSteps = this.config.maxSteps ?? 5

    console.log(LOG, '===== ReAct 循环开始 =====')

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: userPrompt },
    ]

    let stepIndex = 0

    while (stepIndex < maxSteps) {
      stepIndex++
      console.log(LOG, `--- Step ${stepIndex}/${maxSteps} ---`)
      this.config.onStatusReport('thinking', `[${stepIndex}/${maxSteps}] 分析对话，决定下一步...`)

      const result = await generateText({
        model: this.config.model,
        system: this.config.systemPrompt,
        messages,
        tools: this.config.tools as never,
      })

      const text = result.text
      console.log(LOG, `LLM 回答 ${text?.length ?? 0} 字`)
      if (text && text.length > 0) {
        console.log(LOG, 'LLM 文本前 200 字:', text.slice(0, 200))
      }

      // Check if SDK auto-executed tools
      const toolCallsRaw = result.toolCalls as unknown as
        | Array<{ toolName: string; args: unknown; invalid?: boolean }>
        | undefined
      const toolResults = result.toolResults as unknown as
        | Array<{ toolName: string; output: unknown }>
        | undefined

      // Save assistant response to message history
      messages.push({
        role: 'assistant' as const,
        content: text || '（调用工具中...）',
      })

      if (!toolResults || toolResults.length === 0) {
        // Check for failed tool calls (e.g., JSON too large / syntax error)
        const invalidCalls = toolCallsRaw?.filter((t) => t.invalid)
        if (invalidCalls && invalidCalls.length > 0) {
          console.warn(
            LOG,
            `发现 ${invalidCalls.length} 个无效工具调用，重试中:`,
            invalidCalls.map((t) => t.toolName),
          )
          messages.push({
            role: 'assistant' as const,
            content:
              '上一次工具调用参数格式有误（可能 JSON 过长或未闭合），请精简 operations 数量或缩短 summary 后重试。',
          })
          continue
        }

        // toolCalls exist but no results → tool definition mismatch
        if (toolCallsRaw && (toolCallsRaw as Array<{ toolName: string }>).length > 0) {
          console.warn(LOG, 'toolCalls 存在但 toolResults 为空，跳过')
        }

        // No tool calls → final answer
        if (text) {
          const preview = text.length > 100 ? text.slice(0, 100) + '...' : text
          console.log(LOG, '✅ Agent 最终回答:', preview)
          this.config.onStatusReport('generating_mindmap', `完成: ${preview}`)
        }
        return text ?? ''
      }

      console.log(
        LOG,
        `SDK 执行了 ${toolResults.length} 个工具:`,
        toolResults.map((t) => t.toolName).join(', '),
      )
      this.config.onStatusReport(
        'thinking',
        `[${stepIndex}/${maxSteps}] 工具结果已返回，继续分析...`,
      )

      // Inject tool results into message history
      let hadNoopOps = false
      for (const tr of toolResults) {
        if (tr.toolName === 'generateMindmapOps') {
          const output = tr.output as Record<string, unknown> | undefined
          const ops = output?.operations as unknown[] | undefined
          if (ops && ops.length === 0) {
            hadNoopOps = true
          }
        }
        messages.push({
          role: 'assistant' as const,
          content: JSON.stringify({ tool: tr.toolName, result: tr.output }),
        })
      }

      // 如果 generateMindmapOps 返回 0 个操作 → LLM 认为不需要更新 → 结束循环
      if (hadNoopOps) {
        console.log(LOG, 'generateMindmapOps 返回 0 操作，结束循环')
        if (text) {
          this.config.onStatusReport('generating_mindmap', `完成: ${text.slice(0, 100)}`)
        }
        return text ?? ''
      }
    }

    console.warn(LOG, `达到最大步骤数 ${maxSteps}，循环结束`)
    return '已达到最大推理步骤数，请重试或简化问题。'
  }
}
