/// <reference lib="webworker" />
import { createOpenAI } from '@ai-sdk/openai'
import type { MainToWorkerMessage, WorkerToMainMessage } from '../lib/agent/types'
import { ReActRunner } from '../lib/agent/ReActRunner'
import { normalizeEndpoint, resolveApiKey } from '../lib/provider-utils'
import { createAgentTools, reportStatus } from './agent-tools.def'

let runner: ReActRunner | null = null
let systemPrompt = ''
const LOG = '[🧠 Worker]'

type RunMessage = Extract<
  MainToWorkerMessage,
  { type: 'ENHANCE_MESSAGE' | 'MEDIATE_MESSAGE' }
>

/* -------------------------------------------------------------------------- */
/*                            Cancellation state                              */
/* -------------------------------------------------------------------------- */

/** Controller for the run currently executing (single-flight). */
let activeAbort: AbortController | null = null
/** runId currently executing. */
let activeRunId: string | null = null
/** Runs whose CANCEL_RUN arrived while they were still queued. */
const cancelledRuns = new Set<string>()

function getPatternHint(pattern: string): string {
  const hints: Record<string, string> = {
    '5w1h': '知识组织模式：5W1H（What/Why/Who/When/Where/How）',
    tech: '知识组织模式：技术概念（核心定义、使用场景、方案对比、注意事项）',
    'pros-cons': '知识组织模式：优缺点分析（优点、缺点、适用场景）',
  }
  const hint = hints[pattern]
  return hint ? `${hint}\n\n` : ''
}

function createModel(apiKey: string, apiEndpoint: string, modelId: string) {
  const openaiProvider = createOpenAI({
    // Local OpenAI-compatible servers may not use a key; the SDK requires a
    // non-empty string, so resolve it the same way the chat client does.
    apiKey: resolveApiKey(apiEndpoint, apiKey),
    baseURL: normalizeEndpoint(apiEndpoint),
  })
  return openaiProvider.chat(modelId) as never
}

function errorMessage(runId: string, error: string): WorkerToMainMessage {
  return { type: 'AGENT_ERROR', payload: { runId, error } }
}

function cancelledMessage(runId: string): WorkerToMainMessage {
  return { type: 'AGENT_CANCELLED', payload: { runId } }
}

function handleInit(msg: Extract<MainToWorkerMessage, { type: 'INIT' }>) {
  const { providerConfig, model: modelId, mindmapSystemPrompt } = msg.payload
  systemPrompt = mindmapSystemPrompt
  console.log(LOG, '初始化 Agent', { model: modelId, endpoint: providerConfig.apiEndpoint })
  try {
    const model = createModel(providerConfig.apiKey, providerConfig.apiEndpoint, modelId)
    // Tools are built per run (see createAgentTools) so each call carries
    // its own runId. The set installed here is a placeholder.
    runner = new ReActRunner({
      model,
      systemPrompt,
      tools: {},
      onStatusReport: reportStatus,
      maxSteps: 15,
    })
    console.log(LOG, '✅ Agent 初始化成功')
    reportStatus('idle', 'Agent 就绪')
  } catch (err) {
    console.error(LOG, '❌ 初始化失败:', err)
    reportStatus('error', `Agent 初始化失败: ${String(err)}`)
  }
}

async function handleRun(msg: RunMessage): Promise<void> {
  const runId = msg.payload.runId

  // A cancel may have arrived while this run was waiting in the queue.
  if (cancelledRuns.delete(runId)) {
    console.log(LOG, `运行 ${runId} 在排队时已被取消`)
    self.postMessage(cancelledMessage(runId))
    return
  }

  if (!runner) {
    console.error(LOG, `❌ 收到 ${msg.type} 但 Agent 尚未初始化 (runId=${runId})`)
    self.postMessage(errorMessage(runId, 'Agent 尚未初始化'))
    return
  }

  const controller = new AbortController()
  activeAbort = controller
  activeRunId = runId

  try {
    const model = createModel(
      msg.payload.providerConfig.apiKey,
      msg.payload.providerConfig.apiEndpoint,
      msg.payload.model,
    )
    runner.setModel(model)
    runner.setSystemPrompt(systemPrompt)
    runner.setTools(createAgentTools(runId))

    if (msg.type === 'ENHANCE_MESSAGE') {
      console.log(LOG, '开始 ENHANCE_MESSAGE 处理', {
        runId,
        conversationId: msg.payload.conversationId,
        model: msg.payload.model,
        消息数: msg.payload.recentMessages.length,
      })
      reportStatus('thinking', '开始分析对话内容...', runId)
      const patternHint = getPatternHint(msg.payload.pattern)
      const treeContext = msg.payload.mindmapTreeJson || '(空白脑图)'
      const userPrompt = `基于以下对话内容，更新思维导图。

${patternHint}当前脑图结构：
${treeContext}

对话内容：
${msg.payload.recentMessages.map((m) => `[${m.role}]: ${m.content}`).join('\n')}

请按系统指令中的工作流程执行。`
      console.log(LOG, '进入 ReAct 循环')
      const finalAnswer = await runner.run(userPrompt, controller.signal)
      if (controller.signal.aborted) {
        console.log(LOG, 'ENHANCE 运行已取消')
        self.postMessage(cancelledMessage(runId))
        return
      }
      console.log(LOG, 'ReAct 循环结束，最终回答长度:', finalAnswer.length)
      reportStatus('complete', '脑图生成完成', runId)
      self.postMessage({
        type: 'AGENT_COMPLETE',
        payload: { runId, operations: [], newTreeJson: '' },
      } satisfies WorkerToMainMessage)
      console.log(LOG, '✅ 已发送 AGENT_COMPLETE')
      return
    }

    // MEDIATE_MESSAGE
    console.log(LOG, '开始 MEDIATE_MESSAGE 处理', {
      runId,
      conversationId: msg.payload.conversationId,
      model: msg.payload.model,
    })
    reportStatus('thinking', '正在处理...', runId)
    const recentContext =
      msg.payload.recentMessages.length > 0
        ? `最近对话（上下文参考）：
${msg.payload.recentMessages.map((m) => `[${m.role}]: ${m.content.slice(0, 500)}`).join('\n')}`
        : ''
    const treeContext = msg.payload.mindmapTreeJson || '(空白脑图)'
    const userPrompt = `用户提问：
${msg.payload.content}

当前脑图结构：
${treeContext}

${recentContext}

请按系统指令工作：分析脑图结构 → 更新脑图（尽可能扩展节点、丰富内容）→ 回答用户。`
    console.log(LOG, '进入 ReAct 循环')
    const finalAnswer = await runner.run(userPrompt, controller.signal)
    if (controller.signal.aborted) {
      console.log(LOG, 'MEDIATE 运行已取消')
      self.postMessage(cancelledMessage(runId))
      return
    }
    console.log(LOG, 'ReAct 循环结束，最终回答长度:', finalAnswer.length)
    self.postMessage({
      type: 'STREAM_TOKEN',
      payload: { runId, token: finalAnswer },
    } satisfies WorkerToMainMessage)
    self.postMessage({
      type: 'STREAM_DONE',
      payload: { runId, mindmapUpdated: true },
    } satisfies WorkerToMainMessage)
    reportStatus('complete', '完成', runId)
  } catch (err) {
    if (controller.signal.aborted) {
      console.log(LOG, `运行 ${runId} 被取消（异常路径）`)
      self.postMessage(cancelledMessage(runId))
      return
    }
    console.error(LOG, `❌ ${msg.type} 处理异常:`, err)
    self.postMessage(errorMessage(runId, String(err)))
  } finally {
    if (activeAbort === controller) {
      activeAbort = null
      activeRunId = null
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                        Run serialisation + dispatch                        */
/* -------------------------------------------------------------------------- */

// The worker owns a single ReActRunner (model / system prompt / tool set are
// mutated per run). Runs must therefore be processed strictly one at a time:
// a second request waits for the first to finish instead of swapping the
// runner's configuration underneath an in-flight loop.
let runQueue: Promise<void> = Promise.resolve()

self.onmessage = (event: MessageEvent<MainToWorkerMessage>) => {
  const msg = event.data
  console.log(LOG, '收到消息:', msg.type)

  if (msg.type === 'INIT') {
    handleInit(msg)
    return
  }

  if (msg.type === 'CANCEL_RUN') {
    const target = msg.payload.runId
    if (target && target !== activeRunId) {
      // Queued run — remember the cancellation so it exits without doing work.
      cancelledRuns.add(target)
      return
    }
    if (activeAbort) {
      console.log(LOG, `取消运行 ${target ?? activeRunId ?? '(active)'}`)
      activeAbort.abort()
    }
    return
  }

  if (msg.type === 'ENHANCE_MESSAGE' || msg.type === 'MEDIATE_MESSAGE') {
    runQueue = runQueue.then(() => handleRun(msg)).catch((err) => {
      console.error(LOG, '❌ run queue failure:', err)
    })
  }
}
