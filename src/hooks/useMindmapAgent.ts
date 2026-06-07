import { useEffect, useRef, useCallback } from 'react'
import { useConversationStore } from '@/stores/conversationStore'
import { useProviderStore } from '@/stores/providerStore'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useChatStore } from '@/stores/chatStore'
import { agentToolHandlers } from '@/lib/agent/agent-tools'
import { buildMindmapAgentPrompt } from '@/lib/agent/system-prompt'
import { createAgentStatusGuard } from '@/lib/agent/agent-status-guard'
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  MainToWorkerResponse,
} from '@/lib/agent/types'

const LOG = '[🧠 Agent]'

// Phase 1 fix (Bug 3): wall-clock safety net for the auto-idle
// transition. The previous code had a hard-coded 3 s setTimeout inside
// the `AGENT_COMPLETE` branch and *no* fallback for the `AGENT_ERROR`
// branch, which is what caused the user-visible "生成中" stuck state.
// 5 s is a balance between "user has time to read the status line" and
// "the indicator doesn't get stuck if a message is dropped".
const AGENT_IDLE_FALLBACK_MS = 5000

export function useMindmapAgent() {
  const workerRef = useRef<Worker | null>(null)
  const setAgentStatus = useChatStore((s) => s.setAgentStatus)
  // Phase 1 fix (Bug 3): guard owns the safety-net timer. The guard is
  // created once per hook instance and disposed in the cleanup effect
  // below so a stale timer never fires after unmount.
  const guardRef = useRef(createAgentStatusGuard(setAgentStatus))

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
          // Mirror the status to the guard so a `complete` / `error`
          // status reported by the worker also gets the safety net.
          guardRef.current.recordTransition(msg.payload.status, AGENT_IDLE_FALLBACK_MS)
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
          // Phase 1 fix (Bug 3): schedule a wall-clock safety net
          // (replaces the old ad-hoc 3 s setTimeout). The guard
          // cancels any prior pending timer, so back-to-back
          // completions don't stack timers.
          guardRef.current.recordTransition('complete', AGENT_IDLE_FALLBACK_MS)
          break

        case 'AGENT_ERROR':
          console.error(LOG, '❌ Agent 错误:', msg.payload.error)
          setAgentStatus('error', msg.payload.error)
          // Phase 1 fix (Bug 3): the `AGENT_ERROR` branch previously
          // never returned to `idle` — that's the bug. The guard
          // makes the error indicator auto-clear after
          // AGENT_IDLE_FALLBACK_MS, the same way `complete` does.
          guardRef.current.recordTransition('error', AGENT_IDLE_FALLBACK_MS)
          {
            const state = useConversationStore.getState()
            const convId = state.activeConversationId
            if (convId) {
              const conv = state.conversations.find((c) => c.id === convId)
              const lastMsg = conv?.messages[conv.messages.length - 1]
              if (lastMsg && lastMsg.role === 'assistant' && lastMsg.status === 'streaming') {
                state.updateMessageInConversation(convId, lastMsg.id, {
                  content: msg.payload.error,
                  status: 'error',
                })
              }
            }
          }
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
          // STREAM_DONE is the "I am done talking" signal — clear any
          // pending fallback so the indicator drops to idle *now*
          // instead of after AGENT_IDLE_FALLBACK_MS.
          guardRef.current.clear()
          setAgentStatus('idle')
          break
        }
      }
    }

    // Phase 1 fix (Bug 3): the previous code only listened to
    // `onerror`. We now also listen to `onmessageerror` (fired when
    // a posted message can't be deserialised) so any *reported*
    // worker error flips the indicator to a non-stuck state. Note
    // that the standard `Worker` type does not have an `onclose`
    // event — the close path is covered by the 5 s safety-net
    // timer and the cleanup effect below.
    worker.onerror = (err) => {
      console.error(LOG, 'Worker 运行时错误:', err)
      setAgentStatus('error', 'Worker 内部错误')
      guardRef.current.recordTransition('error', AGENT_IDLE_FALLBACK_MS)
    }

    worker.onmessageerror = (event) => {
      console.error(LOG, 'Worker message 解码失败:', event)
      setAgentStatus('error', 'Worker 消息解析失败')
      guardRef.current.recordTransition('error', AGENT_IDLE_FALLBACK_MS)
    }

    const initMsg: MainToWorkerMessage = {
      type: 'INIT',
      payload: {
        providerConfig: {
          apiEndpoint: provider.apiEndpoint,
          apiKey: provider.apiKey,
        },
        model: conv.modelId,
        mindmapSystemPrompt: buildMindmapAgentPrompt(),
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

      const providers = useProviderStore.getState().providers
      const provider = providers.find((p) => p.id === conv.providerId)

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
          providerConfig: provider
            ? { apiEndpoint: provider.apiEndpoint, apiKey: provider.apiKey }
            : { apiEndpoint: '', apiKey: '' },
          model: conv.modelId,
        },
      }
      worker.postMessage(msg)
    },
    [setAgentStatus],
  )

  const mediateMessage = useCallback(
    (content: string, conversationId: string) => {
      const worker = workerRef.current
      if (!worker) {
        console.warn(LOG, 'mediateMessage: Worker 未就绪')
        return
      }

      const conv = useConversationStore
        .getState()
        .conversations.find((c) => c.id === conversationId)
      if (!conv) return

      const mm = useMindmapStore
        .getState()
        .mindmaps.find((m) =>
          m.monitoredConversationIds?.includes(conversationId),
        )

      const providers = useProviderStore.getState().providers
      const provider = providers.find((p) => p.id === conv.providerId)

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
          providerConfig: provider
            ? { apiEndpoint: provider.apiEndpoint, apiKey: provider.apiKey }
            : { apiEndpoint: '', apiKey: '' },
          model: conv.modelId,
        },
      }
      worker.postMessage(msg)
    },
    [setAgentStatus],
  )

  useEffect(() => {
    // Snapshot the refs and store handle at mount time so the cleanup
    // closure is stable even if the refs are reassigned (the
    // react-hooks/exhaustive-deps rule would otherwise warn that
    // `ref.current` may have changed between render and cleanup).
    const guard = guardRef.current
    const workerAtMount = workerRef.current
    return () => {
      if (workerAtMount) {
        console.log(LOG, '清理 Worker')
        workerAtMount.terminate()
      }
      workerRef.current = null
      // Phase 1 fix (Bug 3): make absolutely sure no pending
      // safety-net timer fires after the hook unmounts, and that
      // the indicator never lingers on 'thinking' / 'generating' /
      // 'complete' / 'error' if the consumer has gone away (e.g.
      // user navigates away, switches conversation, or the panel
      // unmounts on a hot-reload).
      guard.clear()
      guard.dispose()
      setAgentStatus('idle')
    }
  }, [setAgentStatus])

  return { initialize, enhanceMessage, mediateMessage }
}
