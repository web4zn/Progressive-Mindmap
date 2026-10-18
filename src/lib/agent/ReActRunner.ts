import { generateText } from 'ai'
import type { ModelMessage, TextPart, ToolCallPart, ToolResultPart } from 'ai'

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

/** The language-model argument accepted by `generateText`. */
type LanguageModelArg = Parameters<typeof generateText>[0]['model']

/** A tool result payload in the shape the providers can serialize. */
type ToolOutput = ToolResultPart['output']

/** Reasoning content part (`ai` re-exports the type only via provider-utils). */
interface ReasoningContentPart {
  type: 'reasoning'
  text: string
}

/**
 * A single assistant turn as returned by one `generateText` call.
 *
 * `reasoning` is the thinking-mode chain of thought. Providers that expose it
 * (DeepSeek thinking mode, Moonshot, GLM, Qwen …) REQUIRE it to be passed back
 * on every later request that carries `tools`, or they answer with HTTP 400
 * ("The `reasoning_content` in the thinking mode must be passed back to the
 * API"). Providers that do not expose it simply leave it empty.
 */
interface AssistantTurn {
  text: string
  reasoning: string
  toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }>
}

/**
 * Normalize a tool handler's return value into a tool-result payload.
 */
function toToolOutput(value: unknown): ToolOutput {
  if (typeof value === 'string') return { type: 'text', value }
  // Tool results in this app are plain JSON (mindmap operation results), so a
  // JSON round-trip yields exactly the JSONValue the AI SDK expects.
  return { type: 'json', value: JSON.parse(JSON.stringify(value ?? null)) }
}

/**
 * Build the assistant message for a completed tool round: reasoning first (so
 * thinking-mode providers get their `reasoning_content` back), then any text,
 * then the tool calls. Shared with the unit tests.
 */
export function buildAssistantMessage(turn: AssistantTurn): ModelMessage {
  const content: Array<ReasoningContentPart | TextPart | ToolCallPart> = []
  if (turn.reasoning) content.push({ type: 'reasoning', text: turn.reasoning })
  if (turn.text) content.push({ type: 'text', text: turn.text })
  for (const call of turn.toolCalls) {
    content.push({
      type: 'tool-call',
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      input: call.input ?? {},
    })
  }
  return { role: 'assistant', content }
}

/**
 * Build the `tool` message that answers a round's tool calls.
 *
 * Every tool call gets exactly one result: a tool that failed to execute (or
 * whose arguments could not be parsed) is answered with an `error-text` result
 * instead of being skipped. APIs validate that each `tool_call_id` is answered
 * by the following tool turn — a partial list is rejected just like a missing
 * `reasoning_content`.
 */
export function buildToolMessage(
  toolCalls: AssistantTurn['toolCalls'],
  toolResults: Array<{ toolCallId: string; toolName: string; output: unknown }>,
  failureText: string,
): ModelMessage {
  const resultById = new Map(toolResults.map((result) => [result.toolCallId, result]))
  const content: ToolResultPart[] = toolCalls.map((call) => {
    const executed = resultById.get(call.toolCallId)
    return {
      type: 'tool-result',
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      output: executed ? toToolOutput(executed.output) : { type: 'error-text', value: failureText },
    }
  })
  return { role: 'tool', content }
}

/**
 * Configuration for the ReActRunner.
 */
export interface ReActRunnerConfig {
  /** The AI SDK language model (may be updated per-message) */
  model: LanguageModelArg
  /** System prompt for the agent */
  systemPrompt: string
  /** Tool definitions (AI SDK tool() objects) */
  tools: ToolSet
  /** Status report callback */
  onStatusReport: StatusReporter
  /** Maximum ReAct loop steps (default: 5) */
  maxSteps?: number
}

const TOOL_ARGS_ERROR =
  '上一次工具调用参数格式有误（可能 JSON 过长或未闭合），请精简 operations 数量或缩短 summary 后重试。'

const TOOL_EXEC_ERROR = '工具执行失败，请检查参数后重试。'

/**
 * Encapsulates the ReAct (Reasoning + Acting) loop for the mindmap agent.
 *
 * Extracted from agent.worker.ts to separate the reasoning loop from
 * Web Worker message routing. The runner is framework-agnostic — it only
 * depends on the AI SDK's generateText() and a tool set.
 *
 * The conversation is threaded as real `assistant` tool-call turns plus
 * `tool` result turns (never as fabricated assistant text), because
 * thinking-mode providers validate that every assistant turn in a
 * `tools`-carrying request echoes its `reasoning_content`.
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
   * Replace the tool set. The worker builds a fresh tool set per run so
   * each tool call carries the run's `runId` (and therefore the right
   * conversation / mindmap / scope context).
   */
  setTools(tools: ToolSet): void {
    this.config.tools = tools
  }

  /**
   * Run the ReAct loop.
   *
   * @param userPrompt - The user's message / conversation context
   * @param signal - Optional abort signal (run cancellation)
   * @returns Final LLM text response (or empty string if only tool calls were made)
   */
  async run(userPrompt: string, signal?: AbortSignal): Promise<string> {
    const maxSteps = this.config.maxSteps ?? 5

    console.log(LOG, '===== ReAct 循环开始 =====')

    const messages: ModelMessage[] = [{ role: 'user', content: userPrompt }]

    let stepIndex = 0

    while (stepIndex < maxSteps) {
      if (signal?.aborted) {
        console.log(LOG, '运行已取消，结束循环')
        return ''
      }
      stepIndex++
      console.log(LOG, `--- Step ${stepIndex}/${maxSteps} ---`)
      this.config.onStatusReport('thinking', `[${stepIndex}/${maxSteps}] 分析对话，决定下一步...`)

      // The AI SDK's result type is generic over the tool set; let inference
      // pick it instead of annotating (annotating narrows `tools` to never).
      let result
      try {
        result = await generateText({
          model: this.config.model,
          system: this.config.systemPrompt,
          messages,
          tools: this.config.tools as never,
          abortSignal: signal,
        })
      } catch (err) {
        if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
          console.log(LOG, 'LLM 调用已中止（运行取消）')
          return ''
        }
        throw err
      }

      const text = result.text ?? ''
      // Preserve the chain of thought: it must be echoed back while `tools`
      // is present, otherwise thinking-mode providers reject the next call.
      const reasoning = (result.reasoning ?? []).map((part) => part.text).join('')

      console.log(
        LOG,
        `LLM 回答 ${text.length} 字` + (reasoning ? `（thinking ${reasoning.length} 字）` : ''),
      )
      if (text.length > 0) {
        console.log(LOG, 'LLM 文本前 200 字:', text.slice(0, 200))
      }

      // Check if SDK auto-executed tools
      const toolCallsRaw = result.toolCalls as unknown as
        | Array<{ toolCallId: string; toolName: string; input?: unknown; invalid?: boolean }>
        | undefined
      const toolResultsRaw = result.toolResults as unknown as
        | Array<{ toolCallId: string; toolName: string; output: unknown }>
        | undefined

      const toolCalls: AssistantTurn['toolCalls'] = (toolCallsRaw ?? []).map((call) => ({
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        input: call.input ?? {},
      }))
      const toolResults = toolResultsRaw ?? []

      if (toolCalls.length === 0) {
        // No tool calls → final answer
        if (text) {
          const preview = text.length > 100 ? text.slice(0, 100) + '...' : text
          console.log(LOG, '✅ Agent 最终回答:', preview)
          this.config.onStatusReport('generating_mindmap', `完成: ${preview}`)
        }
        return text
      }

      // Save the assistant turn (reasoning + text + tool calls) to the history.
      messages.push(buildAssistantMessage({ text, reasoning, toolCalls }))

      if (toolResults.length === 0) {
        // The model asked for tools but none could be executed (invalid JSON
        // arguments / schema mismatch). Answer the calls with an error result
        // so the loop can retry instead of leaving dangling tool calls.
        console.warn(
          LOG,
          `发现 ${toolCalls.length} 个未执行的工具调用，回填错误结果后重试:`,
          toolCalls.map((call) => call.toolName),
        )
        messages.push(buildToolMessage(toolCalls, [], TOOL_ARGS_ERROR))
        continue
      }

      console.log(
        LOG,
        `SDK 执行了 ${toolResults.length} 个工具:`,
        toolResults.map((toolResult) => toolResult.toolName).join(', '),
      )
      this.config.onStatusReport(
        'thinking',
        `[${stepIndex}/${maxSteps}] 工具结果已返回，继续分析...`,
      )

      // Inject tool results as a proper `tool` turn.
      let hadNoopOps = false
      for (const toolResult of toolResults) {
        if (toolResult.toolName === 'generateMindmapOps') {
          const output = toolResult.output as Record<string, unknown> | undefined
          const ops = output?.operations as unknown[] | undefined
          if (ops && ops.length === 0) {
            hadNoopOps = true
          }
        }
      }
      messages.push(buildToolMessage(toolCalls, toolResults, TOOL_EXEC_ERROR))

      // 如果 generateMindmapOps 返回 0 个操作 → LLM 认为不需要更新 → 结束循环
      if (hadNoopOps) {
        console.log(LOG, 'generateMindmapOps 返回 0 操作，结束循环')
        if (text) {
          this.config.onStatusReport('generating_mindmap', `完成: ${text.slice(0, 100)}`)
        }
        return text
      }
    }

    console.warn(LOG, `达到最大步骤数 ${maxSteps}，循环结束`)
    return '已达到最大推理步骤数，请重试或简化问题。'
  }
}
