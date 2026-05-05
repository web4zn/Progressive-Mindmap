import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createIndexedDBStorage } from '@/lib/indexeddb-storage-adapter'
import type { Provider, Model } from '../types/provider'

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
            const openRouter: Provider = {
              id: generateId(),
              name: 'OpenRouter',
              apiEndpoint: 'https://openrouter.ai/api/v1',
              apiKey: '',
              models: [{ id: 'openrouter/free', name: 'openrouter/free', enabled: true }],
              supportsJsonMode: true,
              createdAt: now,
              updatedAt: now,
            }
            useProviderStore.setState({
              providers: [openRouter],
              selectedProviderId: openRouter.id,
            })
          }
        }
      },
    },
  ),
)
