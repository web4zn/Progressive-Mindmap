import { describe, it, expect, beforeEach } from 'vitest'
import { useProviderStore } from '../providerStore'

beforeEach(() => {
  useProviderStore.setState({
    providers: [],
    selectedProviderId: null,
  })
})

describe('providerStore', () => {
  it('starts with empty providers list', () => {
    const state = useProviderStore.getState()
    expect(state.providers).toEqual([])
    expect(state.selectedProviderId).toBeNull()
  })

  it('adds a provider and auto-selects it', () => {
    const { addProvider } = useProviderStore.getState()
    const provider = addProvider({
      name: 'OpenAI',
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
    })

    const state = useProviderStore.getState()
    expect(state.providers).toHaveLength(1)
    expect(state.providers[0]!.name).toBe('OpenAI')
    expect(state.providers[0]!.models).toEqual([])
    expect(state.selectedProviderId).toBe(provider.id)
  })

  it('adds a provider with models', () => {
    const { addProvider } = useProviderStore.getState()
    addProvider({
      name: 'DeepSeek',
      apiEndpoint: 'https://api.deepseek.com',
      apiKey: 'sk-test',
      models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat', enabled: true }],
    })

    const state = useProviderStore.getState()
    expect(state.providers[0]!.models).toHaveLength(1)
    expect(state.providers[0]!.models[0]!.id).toBe('deepseek-chat')
  })

  it('updates a provider', () => {
    const { addProvider, updateProvider } = useProviderStore.getState()
    const p = addProvider({ name: 'Old', apiEndpoint: 'https://old.com/v1', apiKey: 'sk-old' })

    updateProvider(p.id, { name: 'Updated' })

    const state = useProviderStore.getState()
    expect(state.providers[0]!.name).toBe('Updated')
    expect(state.providers[0]!.updatedAt).toBeGreaterThanOrEqual(p.createdAt)
  })

  it('removes a provider and updates selection', () => {
    const { addProvider, removeProvider } = useProviderStore.getState()
    const p1 = addProvider({ name: 'P1', apiEndpoint: 'https://a.com/v1', apiKey: 'sk-a' })
    const p2 = addProvider({ name: 'P2', apiEndpoint: 'https://b.com/v1', apiKey: 'sk-b' })

    removeProvider(p1.id)

    const state = useProviderStore.getState()
    expect(state.providers).toHaveLength(1)
    expect(state.providers[0]!.name).toBe('P2')
    expect(state.selectedProviderId).toBe(p2.id)
  })

  it('removing the last provider sets selection to null', () => {
    const { addProvider, removeProvider } = useProviderStore.getState()
    const p = addProvider({ name: 'Only', apiEndpoint: 'https://x.com/v1', apiKey: 'sk-x' })

    removeProvider(p.id)

    const state = useProviderStore.getState()
    expect(state.providers).toHaveLength(0)
    expect(state.selectedProviderId).toBeNull()
  })
})
