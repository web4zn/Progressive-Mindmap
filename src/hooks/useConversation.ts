import { useCallback, useRef } from 'react'
import { useConversationStore } from '@/stores/conversationStore'
import { useProviderStore } from '@/stores/providerStore'
import { useChatStore } from '@/stores/chatStore'
import { createClient, streamChat, isAbortError } from '@/lib/llm-client'
import { generateId } from '@/lib/id'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { Message } from '@/types/message'

// ─── 构建干净的聊天历史：去错误、去重复 ───
function cleanChatHistory(allMessages: Message[]): Message[] {
  // 1. 过滤错误
  const noError = allMessages.filter((m) => {
    if (m.status === 'error') return false
    if (m.role === 'assistant' && /^(401|403|500|Error|错误)/.test(m.content)) return false
    return true
  })

  // 2. 去重：相邻相同用户消息只保留最后一个
  const deduped: Message[] = []
  for (let i = 0; i < noError.length; i++) {
    const m = noError[i]
    if (!m) continue
    if (m.role === 'user' && i > 0) {
      const prev = noError[i - 1]
      if (prev?.role === 'user' && prev.content.trim() === m.content.trim()) {
        // 跳过重复：替换前一条（保留时间较新的那条）
        deduped[deduped.length - 1] = m
        continue
      }
    }
    deduped.push(m)
  }
  return deduped
}

interface UseConversationOptions {
  onStreamComplete?: (conversationId: string, messageId: string) => void
}

export function useConversation(options?: UseConversationOptions) {
  const abortRef = useRef<AbortController | null>(null)

  const isGenerating = useChatStore((s) => s.isGenerating)
  const startGeneration = useChatStore((s) => s.startGeneration)
  const stopGeneration = useChatStore((s) => s.stopGeneration)
  const setError = useChatStore((s) => s.setError)

  const sendMessage = useCallback(
    async (content: string, conversationId: string) => {
      const conv = useConversationStore
        .getState()
        .conversations.find((c) => c.id === conversationId)
      if (!conv) return
      const prov = useProviderStore
        .getState()
        .providers.find((p) => p.id === conv.providerId)
      if (!prov) return
      if (useChatStore.getState().isGenerating) return

      const store = useConversationStore.getState()

      // 创建用户消息
      const userMsg = {
        id: generateId(),
        role: 'user' as const,
        content,
        createdAt: Date.now(),
        status: 'complete' as const,
      }
      store.addMessageToConversation(conversationId, userMsg)

      // 创建助理消息（占位，等待流式填充）
      const assistantMsg = {
        id: generateId(),
        role: 'assistant' as const,
        content: '',
        createdAt: Date.now(),
        status: 'streaming' as const,
      }
      store.addMessageToConversation(conversationId, assistantMsg)

      // 开始生成
      const controller = startGeneration()
      abortRef.current = controller

      try {
        const client = createClient(prov)
        const history = cleanChatHistory([...conv.messages, userMsg])
          .slice(-6)
          .map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          }))

        // 纯聊天 system prompt — 不含脑图指令
        const systemContent =
          conv.systemPrompt || '你是一个有用的 AI 助手。请用中文回答。'

        const messages: ChatCompletionMessageParam[] = [
          { role: 'system', content: systemContent },
          ...history,
        ]

        // 流式响应
        let fullContent = ''
        for await (const token of streamChat(client, {
          model: conv.modelId,
          messages,
          signal: controller.signal,
        })) {
          fullContent += token
          store.updateMessageInConversation(conversationId, assistantMsg.id, {
            content: fullContent,
          })
        }

        // 标记完成
        store.updateMessageInConversation(conversationId, assistantMsg.id, {
          status: 'complete',
        })

        // 触发 Agent 后台增强
        options?.onStreamComplete?.(conversationId, assistantMsg.id)
      } catch (err) {
        if (isAbortError(err)) {
          store.updateMessageInConversation(conversationId, assistantMsg.id, {
            status: 'complete',
          })
        } else {
          const message = err instanceof Error ? err.message : '请求失败'
          store.updateMessageInConversation(conversationId, assistantMsg.id, {
            content: message,
            status: 'error',
          })
          setError(message)
        }
      } finally {
        stopGeneration()
        abortRef.current = null
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options?.onStreamComplete, startGeneration, stopGeneration, setError],
  )

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    stopGeneration()
  }, [stopGeneration])

  return {
    sendMessage,
    stopGeneration: handleStop,
    isGenerating,
  }
}
