import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createIndexedDBStorage } from '@/lib/indexeddb-storage-adapter'
import type { Provider, Model } from '../types/provider'
import { toast } from 'sonner'

const OPENROUTER_PRESET = {
  name: 'OpenRouter',
  apiEndpoint: 'https://openrouter.ai/api/v1',
  models: [
    { id: 'google/gemma-3-12b-it:free', name: 'Gemma 3 12B (免费)', enabled: true },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (免费)', enabled: true },
    { id: 'mistralai/mistral-nemo:free', name: 'Mistral Nemo (免费)', enabled: true },
    { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (免费)', enabled: true },
    { id: 'qwen/qwen2.5-7b-instruct:free', name: 'Qwen 2.5 7B (免费)', enabled: true },
  ],
}

interface ProviderState {
  providers: Provider[]
  selectedProviderId: string | null
  addProvider: (data: {
    name: string
    apiEndpoint: string
    apiKey: string
    models?: Model[]
  }) => Provider
  updateProvider: (
    id: string,
    data: Partial<Pick<Provider, 'name' | 'apiEndpoint' | 'apiKey' | 'models'>>,
  ) => void
  removeProvider: (id: string) => void
  setSelectedProviderId: (id: string | null) => void
  getSelectedProvider: () => Provider | null
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function detectJsonMode(apiEndpoint: string): boolean {
  const lower = apiEndpoint.toLowerCase()
  return (
    lower.includes('api.openai.com') ||
    lower.includes('api.deepseek.com') ||
    lower.includes('api.siliconflow.cn') ||
    lower.includes('openrouter.ai') ||
    lower.includes('generativelanguage.googleapis.com')
  )
}

export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      providers: [],
      selectedProviderId: null,

      addProvider: (data) => {
        const provider: Provider = {
          id: generateId(),
          name: data.name,
          apiEndpoint: data.apiEndpoint,
          apiKey: data.apiKey,
          models: data.models ?? [],
          supportsJsonMode: detectJsonMode(data.apiEndpoint),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((state) => ({
          providers: [...state.providers, provider],
          selectedProviderId: state.selectedProviderId ?? provider.id,
        }))
        return provider
      },

      updateProvider: (id, data) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p,
          ),
        }))
      },

      removeProvider: (id) => {
        const provider = get().providers.find((p) => p.id === id)
        if (provider?.preset) {
          toast.error('系统预置模型不可删除')
          return
        }
        set((state) => {
          const remaining = state.providers.filter((p) => p.id !== id)
          return {
            providers: remaining,
            selectedProviderId:
              state.selectedProviderId === id
                ? (remaining[0]?.id ?? null)
                : state.selectedProviderId,
          }
        })
      },

      setSelectedProviderId: (id) => set({ selectedProviderId: id }),

      getSelectedProvider: () => {
        const { providers, selectedProviderId } = get()
        return providers.find((p) => p.id === selectedProviderId) ?? null
      },
    }),
    {
      name: 'provider-store',
      version: 3,
      storage: createJSONStorage(() => createIndexedDBStorage()),
      onRehydrateStorage: () => {
        let initialized = false
        return (_state, error) => {
          if (error || initialized) return
          initialized = true
          const current = useProviderStore.getState()
          if (current.providers.length === 0) {
            const now = Date.now()
            const presetProvider: Provider = {
              id: generateId(),
              name: OPENROUTER_PRESET.name,
              apiEndpoint: OPENROUTER_PRESET.apiEndpoint,
              apiKey: '',
              models: OPENROUTER_PRESET.models,
              preset: true,
              supportsJsonMode: true,
              createdAt: now,
              updatedAt: now,
            }
            useProviderStore.setState({
              providers: [presetProvider],
              selectedProviderId: presetProvider.id,
            })
          }
        }
      },
    },
  ),
)
