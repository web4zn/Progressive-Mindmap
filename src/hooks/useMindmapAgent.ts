import { useEffect, useRef, useCallback } from 'react'
import { useConversationStore } from '@/stores/conversationStore'
import { useProviderStore } from '@/stores/providerStore'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useChatStore } from '@/stores/chatStore'
import { agentToolHandlers } from '@/lib/agent/agent-tools'
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  MainToWorkerResponse,
} from '@/lib/agent/types'

const LOG = '[🧠 Agent]'

export function useMindmapAgent() {
  const workerRef = useRef<Worker | null>(null)
  const setAgentStatus = useChatStore((s) => s.setAgentStatus)

  // ── 初始化 Worker ──
  const initialize = useCallback(() => {
    if (workerRef.current) {
      console.log(LOG, 'Worker 已存在，跳过初始化')
      return
    }

    const conv = useConversationStore.getState().getActiveConversation()
    const providers = useProviderStore.getState().providers
    const provider = conv
      ? providers.find((p) => p.id === conv.providerId)
      : null
    if (!provider || !conv) {
      console.log(LOG, '跳过初始化: 无活跃会话或提供商')
      return
    }

    if (typeof Worker === 'undefined') {
      console.warn(LOG, '浏览器不支持 Web Worker，Agent 不可用')
      return
    }

    console.log(LOG, '创建 Worker...', {
      model: conv.modelId,
      endpoint: provider.apiEndpoint,
      linkedMindmaps: useMindmapStore.getState().mindmaps.filter((m) =>
        m.monitoredConversationIds?.includes(conv.id),
      ).length,
    })

    const worker = new Worker(
      new URL('@/workers/agent.worker.ts', import.meta.url),
      { type: 'module' },
    )

    worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
      const msg = event.data

      switch (msg.type) {
        case 'AGENT_STATUS':
          console.log(LOG, `状态: ${msg.payload.status}`, msg.payload.message || '')
          setAgentStatus(msg.payload.status, msg.payload.message)
          break

        case 'TOOL_RESULT_NEEDED': {
          console.log(LOG, `← Worker 请求工具: ${msg.payload.toolName}`, {
            args: msg.payload.args,
            callId: msg.payload.callId,
          })
          const handler = agentToolHandlers[msg.payload.toolName]
          if (handler) {
            handler(msg.payload.args)
              .then((result) => {
                console.log(LOG, `→ 工具 ${msg.payload.toolName} 结果:`, result)
                const response: MainToWorkerResponse = {
                  type: 'TOOL_RESULT',
                  payload: { callId: msg.payload.callId, result },
                }
                worker.postMessage(response)
              })
              .catch((err) => {
                console.error(LOG, `工具 ${msg.payload.toolName} 错误:`, err)
                const response: MainToWorkerResponse = {
                  type: 'TOOL_ERROR',
                  payload: { callId: msg.payload.callId, error: String(err) },
                }
                worker.postMessage(response)
              })
          } else {
            console.error(LOG, `未知工具: ${msg.payload.toolName}`)
            const response: MainToWorkerResponse = {
              type: 'TOOL_ERROR',
              payload: {
                callId: msg.payload.callId,
                error: `未知工具: ${msg.payload.toolName}`,
              },
            }
            worker.postMessage(response)
          }
          break
        }

        case 'AGENT_COMPLETE':
          console.log(LOG, '✅ Agent 完成', {
            operations: msg.payload.operations.length,
            hasTree: !!msg.payload.newTreeJson,
          })
          setAgentStatus('complete', '脑图已更新')
          setTimeout(() => setAgentStatus('idle'), 3000)
          break

        case 'AGENT_ERROR':
          console.error(LOG, '❌ Agent 错误:', msg.payload.error)
          setAgentStatus('error', msg.payload.error)
          break

        case 'STREAM_TOKEN': {
          // 中介模式：流式更新 assistant 消息
          const convId = useConversationStore.getState().activeConversationId
          if (!convId) break
          const state = useConversationStore.getState()
          const conv = state.conversations.find((c) => c.id === convId)
          if (!conv) break
          const lastMsg = conv.messages[conv.messages.length - 1]
          if (!lastMsg || lastMsg.role !== 'assistant') break
          state.updateMessageInConversation(convId, lastMsg.id, {
            content: (lastMsg.content || '') + msg.payload.token,
          })
          break
        }

        case 'STREAM_DONE': {
          const convId = useConversationStore.getState().activeConversationId
          if (!convId) break
          const state = useConversationStore.getState()
          const conv = state.conversations.find((c) => c.id === convId)
          if (!conv) break
          const lastMsg = conv.messages[conv.messages.length - 1]
          if (!lastMsg || lastMsg.role !== 'assistant') break
          state.updateMessageInConversation(convId, lastMsg.id, {
            status: 'complete',
          })
          setAgentStatus('idle')
          break
        }
      }
    }

    worker.onerror = (err) => {
      console.error(LOG, 'Worker 运行时错误:', err)
      setAgentStatus('error', 'Worker 内部错误')
    }

    const initMsg: MainToWorkerMessage = {
      type: 'INIT',
      payload: {
        providerConfig: {
          apiEndpoint: provider.apiEndpoint,
          apiKey: provider.apiKey,
        },
        model: conv.modelId,
        // Agent 的系统 prompt 是工具使用指南，不是脑图生成指令
        // buildFullMindmapPrompt() 只在 generateMindmapOps 工具内部使用
        mindmapSystemPrompt: `你是思维导图生成助手。通过工具来更新脑图。

工具：
1. readMindmap — 读取当前脑图，返回每个节点的 ID（如 [id: xxxx]）、标签、摘要。
2. generateMindmapOps — 提交脑图增量操作。调用它传入 operations 数组来更新脑图。

工作流程：
步骤 1: 调用 readMindmap 获取树结构 + 节点 ID
步骤 2: 调用 generateMindmapOps 提交脑图更新。用户提问几乎总是包含新信息或有价值的视角，应尽量创建新节点来组织信息。即使脑图已有相关内容，也应以新节点的形式补充细节或新视角。无改动时才传 {"operations": []}。注意：
  - parentId 和 nodeId 必须用 readMindmap 返回的真实 ID，新脑图时 add_child 可不传 parentId（默认加到第一个根节点）
  - 创建新节点时（add_child/add_root），请用 id 字段指定一个有意义的英文 ID（如 "python", "rust-vs-cangjie"），后续操作用 parentId 引用
  - 不能用数字 1、2、3 等作为 ID
  - [用户编辑] 节点不要 update 或 delete
  - delete_leaf 只能删无子节点的叶子
  - 重复概念用 update 更新摘要，而不是 add_child
  - 无改动时传 {"operations": []}
步骤 3: 输出分析总结

每个工具最多调用一次。generateMindmapOps 之后直接输出回答，不要再用工具。`,
      },
    }
    worker.postMessage(initMsg)
    workerRef.current = worker
    console.log(LOG, 'Worker 初始化消息已发送')
  }, [setAgentStatus])

  // ── 触发脑图增强 ──
  const enhanceMessage = useCallback(
    (conversationId: string) => {
      const worker = workerRef.current
      if (!worker) {
        console.warn(LOG, 'enhanceMessage: Worker 未初始化，跳过')
        return
      }

      const conv = useConversationStore
        .getState()
        .conversations.find((c) => c.id === conversationId)
      if (!conv) {
        console.warn(LOG, `enhanceMessage: 会话 ${conversationId} 未找到`)
        return
      }

      const mm = useMindmapStore
        .getState()
        .mindmaps.find((m) =>
          m.monitoredConversationIds?.includes(conversationId),
        )
      if (!mm) {
        console.log(LOG, `enhanceMessage: 会话 ${conversationId} 未关联脑图，跳过`)
        return
      }

      const recentMessages = conv.messages.slice(-6)
      console.log(LOG, '发送 ENHANCE_MESSAGE', {
        conversationId,
        消息数: recentMessages.length,
        脑图节点数: mm.tree.length,
        脑图模式: mm.pattern,
      })

      setAgentStatus('thinking', '准备分析对话...')

      const msg: MainToWorkerMessage = {
        type: 'ENHANCE_MESSAGE',
        payload: {
          conversationId,
          recentMessages: recentMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mindmapTreeJson:
            mm.tree.length > 0 ? JSON.stringify(mm.tree) : '',
          pattern: mm.pattern ?? 'auto',
        },
      }
      worker.postMessage(msg)
    },
    [setAgentStatus],
  )

  const mediateMessage = useCallback(
    (content: string, conversationId: string) => {
      const worker = workerRef.current
      if (!worker) return

      const conv = useConversationStore
        .getState()
        .conversations.find((c) => c.id === conversationId)
      if (!conv) return

      const mm = useMindmapStore
        .getState()
        .mindmaps.find((m) =>
          m.monitoredConversationIds?.includes(conversationId),
        )

      setAgentStatus('thinking', '正在处理...')

      const msg: MainToWorkerMessage = {
        type: 'MEDIATE_MESSAGE',
        payload: {
          conversationId,
          content,
          recentMessages: conv.messages.slice(-4).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mindmapTreeJson: mm?.tree.length ? JSON.stringify(mm.tree) : '',
        },
      }
      worker.postMessage(msg)
    },
    [setAgentStatus],
  )

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        console.log(LOG, '清理 Worker')
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  return { initialize, enhanceMessage, mediateMessage }
}
