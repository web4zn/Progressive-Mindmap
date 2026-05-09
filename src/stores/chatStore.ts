import { create } from 'zustand'
import type { AgentStatus } from '../lib/agent/types'

interface ChatState {
  isGenerating: boolean
  error: string | null
  abortController: AbortController | null
  setIsGenerating: (v: boolean) => void
  setError: (e: string | null) => void
  startGeneration: () => AbortController
  stopGeneration: () => void

  // Agent
  agentStatus: AgentStatus
  agentMessage: string | null
  setAgentStatus: (s: AgentStatus, msg?: string | null) => void
  agentMode: 'enhance' | 'mediate'
  setAgentMode: (m: 'enhance' | 'mediate') => void
}

export const useChatStore = create<ChatState>()((set, get) => ({
  isGenerating: false,
  error: null,
  abortController: null,

  setIsGenerating: (v) => set({ isGenerating: v }),
  setError: (e) => set({ error: e }),

  startGeneration: () => {
    const controller = new AbortController()
    set({ isGenerating: true, error: null, abortController: controller })
    return controller
  },

  stopGeneration: () => {
    const { abortController } = get()
    abortController?.abort()
    set({ isGenerating: false, abortController: null })
  },

  // Agent state
  agentStatus: 'idle',
  agentMessage: null,
  setAgentStatus: (s, msg) => set({ agentStatus: s, agentMessage: msg ?? null }),
  agentMode: 'enhance',
  setAgentMode: (m) => set({ agentMode: m }),
}))
