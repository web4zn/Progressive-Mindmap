import { create } from 'zustand'

interface ChatState {
  isGenerating: boolean
  error: string | null
  abortController: AbortController | null
  setIsGenerating: (v: boolean) => void
  setError: (e: string | null) => void
  startGeneration: () => AbortController
  stopGeneration: () => void
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
}))
