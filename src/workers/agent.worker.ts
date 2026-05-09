/// <reference lib="WebWorker" />
import { generateText, tool } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  MainToWorkerResponse,
} from '../lib/agent/types'

// ─── 初始化状态 ───
let languageModel: ReturnType<ReturnType<typeof createOpenAI>> | null = null
let systemPrompt = ''

const LOG = '[🧠 Worker]'

// ─── Round-trip: Worker 请求主线程执行工具 ───
function callMain(toolName: string, args: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const callId = crypto.randomUUID()
    console.log(LOG, `→ 请求主线程执行工具: ${toolName}`, { args, callId })

    const handler = (event: MessageEvent<MainToWorkerResponse>) => {
      const msg = event.data
      if (msg.type === 'TOOL_RESULT' && msg.payload.callId === callId) {
        self.removeEventListener('message', handler)
        console.log(LOG, `← 工具 ${toolName} 结果已返回`)
        resolve(msg.payload.result)
      }
      if (msg.type === 'TOOL_ERROR' && msg.payload.callId === callId) {
        self.removeEventListener('message', handler)
        console.error(LOG, `← 工具 ${toolName} 返回错误:`, msg.payload.error)
        reject(new Error(msg.payload.error))
      }
    }
    self.addEventListener('message', handler)

    const postMsg: WorkerToMainMessage = {
      type: 'TOOL_RESULT_NEEDED',
      payload: { callId, toolName, args },
    }
    self.postMessage(postMsg)
  })
}

// ─── 报告状态 ───
function reportStatus(
  status: 'idle' | 'thinking' | 'reading_mindmap' | 'generating_mindmap' | 'complete' | 'error',
  message?: string,
) {
  const postMsg: WorkerToMainMessage = {
    type: 'AGENT_STATUS',
    payload: { status: status as never, message },
  }
  self.postMessage(postMsg)
}

// ─── 工具定义（使用 AI SDK 原生 tool，含 inputSchema） ───
const agentTools = {
  readMindmap: tool({
    description: '读取当前脑图结构，返回每个节点的 ID、标签、摘要。用于了解现有结构后再决定操作。',
    inputSchema: z.object({}),
    execute: async () => {
      reportStatus('reading_mindmap', '正在读取脑图...')
      const result = await callMain('readMindmap', {})
      return JSON.stringify(result)
    },
  }),
  generateMindmapOps: tool({
    description: '应用脑图增量更新操作。先调用 readMindmap 获取节点 ID，然后根据对话内容决定操作，最后调用本工具提交操作。',
    inputSchema: z.object({
      operations: z.array(z.object({
        type: z.enum(['add_child', 'update', 'delete_leaf', 'add_root']).describe('操作类型'),
        parentId: z.string().optional().describe('add_child 时必填，目标父节点 ID'),
        nodeId: z.string().optional().describe('update/delete_leaf 时必填，目标节点 ID'),
        label: z.string().optional().describe('add_child/add_root 时必填，节点标题'),
        summary: z.string().optional().describe('节点摘要'),
        patch: z.object({
          label: z.string().optional(),
          summary: z.string().optional(),
        }).optional().describe('update 时使用，要更新的字段'),
      })),
    }),
    execute: async ({ operations }) => {
      reportStatus('generating_mindmap', `应用 ${operations.length} 个操作...`)
      const result = await callMain('generateMindmapOps', { operations })
      return JSON.stringify(result)
    },
  }),
}

// ─── ReAct 循环（AI SDK 原生工具调用） ───
async function runReActLoop(userPrompt: string): Promise<string> {
  if (!languageModel) throw new Error('Agent 未初始化')

  console.log(LOG, '===== ReAct 循环开始 =====')

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: userPrompt },
  ]

  let stepIndex = 0
  const maxSteps = 5

  while (stepIndex < maxSteps) {
    stepIndex++
    console.log(LOG, `--- Step ${stepIndex}/${maxSteps} ---`)
    reportStatus('thinking', `[${stepIndex}/${maxSteps}] 分析对话，决定下一步...`)

    const result = await generateText({
      model: languageModel,
      system: systemPrompt,
      messages,
      tools: agentTools as never,
    })

    const text = result.text
    console.log(LOG, `LLM 回答 ${text?.length ?? 0} 字`)
    if (text && text.length > 0) {
      console.log(LOG, 'LLM 文本前 200 字:', text.slice(0, 200))
    }

    // 保存 LLM 回答（可能有 tool calls 或最终文本）
    if (text) {
      messages.push({ role: 'assistant' as const, content: text })
    }

    // 检查 SDK 是否已自动执行了工具
    const toolResults = result.toolResults as unknown as
      | Array<{ toolName: string; output: unknown }>
      | undefined

    if (!toolResults || toolResults.length === 0) {
      // 没有工具调用 → 最终回答
      if (text) {
        const preview = text.length > 100 ? text.slice(0, 100) + '...' : text
        console.log(LOG, '✅ Agent 最终回答:', preview)
        reportStatus('generating_mindmap', `完成: ${preview}`)
      }
      return text ?? ''
    }

    console.log(LOG, `SDK 执行了 ${toolResults.length} 个工具:`, toolResults.map((t) => t.toolName).join(', '))
    reportStatus('thinking', `[${stepIndex}/${maxSteps}] 工具结果已返回，继续分析...`)

    // 把工具结果作为消息加回 messages，让下一轮 LLM 看到
    for (const tr of toolResults) {
      messages.push({
        role: 'assistant' as const,
        content: `[工具 ${tr.toolName} 结果]: ${JSON.stringify(tr.output)}`,
      })
    }
  }

  console.warn(LOG, `达到最大步骤数 ${maxSteps}，循环结束`)
  return '已达到最大推理步骤数，请重试或简化问题。'
}

// ─── 模式提示 ───
function getPatternHint(pattern: string): string {
  const hints: Record<string, string> = {
    '5w1h': '知识组织模式：5W1H（What/Why/Who/When/Where/How）',
    tech: '知识组织模式：技术概念（核心定义、使用场景、方案对比、注意事项）',
    'pros-cons': '知识组织模式：优缺点分析（优点、缺点、适用场景）',
  }
  const hint = hints[pattern]
  return hint ? `${hint}\n\n` : ''
}

// ─── 主消息处理 ───
self.onmessage = async (event: MessageEvent<MainToWorkerMessage>) => {
  const msg = event.data
  console.log(LOG, '收到消息:', msg.type)

  switch (msg.type) {
    case 'INIT': {
      const { providerConfig, model: modelId, mindmapSystemPrompt } = msg.payload
      systemPrompt = mindmapSystemPrompt
      console.log(LOG, '初始化 Agent', {
        model: modelId,
        endpoint: providerConfig.apiEndpoint,
      })

      try {
        const openaiProvider = createOpenAI({
          apiKey: providerConfig.apiKey,
          baseURL: providerConfig.apiEndpoint,
        })
        languageModel = openaiProvider.chat(modelId) as never
        console.log(LOG, '✅ Agent 初始化成功')
        reportStatus('idle', 'Agent 就绪')
      } catch (err) {
        console.error(LOG, '❌ 初始化失败:', err)
        reportStatus('error', `Agent 初始化失败: ${String(err)}`)
      }
      break
    }

    case 'ENHANCE_MESSAGE': {
      console.log(LOG, '开始 ENHANCE_MESSAGE 处理', {
        conversationId: msg.payload.conversationId,
        消息数: msg.payload.recentMessages.length,
        有现有脑图: !!msg.payload.mindmapTreeJson,
      })

      reportStatus('thinking', '开始分析对话内容...')

      try {
        const patternHint = getPatternHint(msg.payload.pattern)

        const userPrompt = `基于以下对话内容，更新思维导图。

${patternHint}
对话内容：
${msg.payload.recentMessages
  .map((m) => `[${m.role}]: ${m.content}`)
  .join('\n')}

请按系统指令中的工作流程执行。`

        console.log(LOG, '进入 ReAct 循环')
        const finalAnswer = await runReActLoop(userPrompt)
        console.log(LOG, 'ReAct 循环结束，最终回答长度:', finalAnswer.length)
        void finalAnswer

        reportStatus('generating_mindmap', '脑图生成完成')

        const completeMsg: WorkerToMainMessage = {
          type: 'AGENT_COMPLETE',
          payload: { operations: [], newTreeJson: '' },
        }
        self.postMessage(completeMsg)
        console.log(LOG, '✅ 已发送 AGENT_COMPLETE')
      } catch (err) {
        console.error(LOG, '❌ ENHANCE_MESSAGE 处理异常:', err)
        const errorMsg: WorkerToMainMessage = {
          type: 'AGENT_ERROR',
          payload: { error: String(err) },
        }
        self.postMessage(errorMsg)
      }
      break
    }
  }
}
