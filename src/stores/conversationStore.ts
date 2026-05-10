import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createIndexedDBStorage } from '@/lib/indexeddb-storage-adapter'
import type { Conversation } from '../types/conversation'
import type { Message } from '../types/message'

interface ConversationState {
  conversations: Conversation[]
  activeConversationId: string | null
  addConversation: (data: {
    providerId: string
    modelId: string
    systemPrompt?: string
  }) => Conversation
      updateConversation: (
    id: string,
    data: Partial<Pick<Conversation, 'title' | 'providerId' | 'modelId' | 'systemPrompt' | 'agentMode'>>,
  ) => void
  removeConversation: (id: string) => void
  archiveConversation: (id: string) => void
  unarchiveConversation: (id: string) => void
  setActiveConversationId: (id: string | null) => void
  getActiveConversation: () => Conversation | null
  addMessageToConversation: (conversationId: string, message: Message) => void
  updateMessageInConversation: (
    conversationId: string,
    messageId: string,
    updates: Partial<Pick<Message, 'content' | 'status'>>,
  ) => void
  removeLastAssistantMessage: (conversationId: string) => void
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,

      addConversation: (data) => {
        const now = Date.now()
        const conversation: Conversation = {
          id: generateId(),
          title: '新对话',
          providerId: data.providerId,
          modelId: data.modelId,
          systemPrompt: data.systemPrompt ?? '',
          messages: [],
          agentMode: 'enhance',
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: conversation.id,
        }))
        return conversation
      },

      updateConversation: (id, data) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...data, updatedAt: Date.now() } : c,
          ),
        }))
      },

      removeConversation: (id) => {
        set((state) => {
          const remaining = state.conversations.filter((c) => c.id !== id)
          return {
            conversations: remaining,
            activeConversationId:
              state.activeConversationId === id
                ? (remaining[0]?.id ?? null)
                : state.activeConversationId,
          }
        })
      },

      archiveConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, archived: true, updatedAt: Date.now() } : c,
          ),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        }))
      },

      unarchiveConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, archived: false, updatedAt: Date.now() } : c,
          ),
          activeConversationId: id,
        }))
      },

      setActiveConversationId: (id) => set({ activeConversationId: id }),

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get()
        return conversations.find((c) => c.id === activeConversationId) ?? null
      },

      addMessageToConversation: (conversationId, message) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            const title =
              c.title === '新对话' && message.role === 'user'
                ? message.content.length > 20
                  ? message.content.slice(0, 20) + '...'
                  : message.content
                : c.title
            return {
              ...c,
              title,
              messages: [...c.messages, message],
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      updateMessageInConversation: (conversationId, messageId, updates) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            return {
              ...c,
              messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      removeLastAssistantMessage: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c
            const lastIndex = c.messages.length - 1
            if (lastIndex >= 0 && c.messages[lastIndex]?.role === 'assistant') {
              return { ...c, messages: c.messages.slice(0, -1), updatedAt: Date.now() }
            }
            return c
          }),
        }))
      },
    }),
    {
      name: 'conversation-store',
      version: 2,
      storage: createJSONStorage(() => createIndexedDBStorage()),
    },
  ),
)
