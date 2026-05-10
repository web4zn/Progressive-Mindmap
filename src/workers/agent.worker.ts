/// <reference lib="WebWorker" />
import { createOpenAI } from '@ai-sdk/openai'
import type { MainToWorkerMessage, WorkerToMainMessage } from '../lib/agent/types'
import { ReActRunner } from '../lib/agent/ReActRunner'
import { agentTools, reportStatus } from './agent-tools.def'

let runner: ReActRunner | null = null
let systemPrompt = ''
const LOG = '[🧠 Worker]'

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
  const openaiProvider = createOpenAI({ apiKey, baseURL: apiEndpoint })
  return openaiProvider.chat(modelId) as never
}

self.onmessage = async (event: MessageEvent<MainToWorkerMessage>) => {
  const msg = event.data
  console.log(LOG, '收到消息:', msg.type)

  switch (msg.type) {
    case 'INIT': {
      const { providerConfig, model: modelId, mindmapSystemPrompt } = msg.payload
      systemPrompt = mindmapSystemPrompt
      console.log(LOG, '初始化 Agent', { model: modelId, endpoint: providerConfig.apiEndpoint })
      try {
        const model = createModel(providerConfig.apiKey, providerConfig.apiEndpoint, modelId)
        runner = new ReActRunner({ model, systemPrompt, tools: agentTools, onStatusReport: reportStatus })
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
        model: msg.payload.model,
        消息数: msg.payload.recentMessages.length,
      })
      try {
        const model = createModel(
          msg.payload.providerConfig.apiKey,
          msg.payload.providerConfig.apiEndpoint,
          msg.payload.model,
        )
        runner?.setModel(model)
        runner?.setSystemPrompt(systemPrompt)
      } catch (err) {
        console.error(LOG, '❌ 创建 model 失败:', err)
        reportStatus('error', `模型初始化失败: ${String(err)}`)
        return
      }
      reportStatus('thinking', '开始分析对话内容...')
      try {
        const patternHint = getPatternHint(msg.payload.pattern)
        const userPrompt = `基于以下对话内容，更新思维导图。

${patternHint}
对话内容：
${msg.payload.recentMessages.map((m) => `[${m.role}]: ${m.content}`).join('\n')}

请按系统指令中的工作流程执行。`
        console.log(LOG, '进入 ReAct 循环')
        const finalAnswer = await runner!.run(userPrompt)
        console.log(LOG, 'ReAct 循环结束，最终回答长度:', finalAnswer.length)
        void finalAnswer
        reportStatus('generating_mindmap', '脑图生成完成')
        self.postMessage({
          type: 'AGENT_COMPLETE',
          payload: { operations: [], newTreeJson: '' },
        } satisfies WorkerToMainMessage)
        console.log(LOG, '✅ 已发送 AGENT_COMPLETE')
      } catch (err) {
        console.error(LOG, '❌ ENHANCE_MESSAGE 处理异常:', err)
        self.postMessage({
          type: 'AGENT_ERROR',
          payload: { error: String(err) },
        } satisfies WorkerToMainMessage)
      }
      break
    }

    case 'MEDIATE_MESSAGE': {
      console.log(LOG, '开始 MEDIATE_MESSAGE 处理', {
        conversationId: msg.payload.conversationId,
        model: msg.payload.model,
      })
      try {
        const model = createModel(
          msg.payload.providerConfig.apiKey,
          msg.payload.providerConfig.apiEndpoint,
          msg.payload.model,
        )
        runner?.setModel(model)
        runner?.setSystemPrompt(systemPrompt)
      } catch (err) {
        console.error(LOG, '❌ 创建 model 失败:', err)
        reportStatus('error', `模型初始化失败: ${String(err)}`)
        return
      }
      reportStatus('thinking', '正在处理...')
      try {
        const recentContext =
          msg.payload.recentMessages.length > 0
            ? `最近对话（上下文参考）：
${msg.payload.recentMessages.map((m) => `[${m.role}]: ${m.content.slice(0, 500)}`).join('\n')}`
            : ''
        const userPrompt = `用户提问：
${msg.payload.content}

${recentContext}

请按系统指令工作：先读脑图 → 更新脑图（尽可能扩展节点、丰富内容）→ 回答用户。`
        console.log(LOG, '进入 ReAct 循环')
        const finalAnswer = await runner!.run(userPrompt)
        console.log(LOG, 'ReAct 循环结束，最终回答长度:', finalAnswer.length)
        self.postMessage({
          type: 'STREAM_TOKEN',
          payload: { token: finalAnswer },
        } satisfies WorkerToMainMessage)
        self.postMessage({
          type: 'STREAM_DONE',
          payload: { mindmapUpdated: true },
        } satisfies WorkerToMainMessage)
        reportStatus('generating_mindmap', '完成')
      } catch (err) {
        console.error(LOG, '❌ MEDIATE_MESSAGE 处理异常:', err)
        self.postMessage({
          type: 'AGENT_ERROR',
          payload: { error: String(err) },
        } satisfies WorkerToMainMessage)
      }
      break
    }
  }
}
