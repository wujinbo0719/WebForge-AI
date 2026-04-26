import { create } from 'zustand'

export type AIProviderType =
  | 'claude'
  | 'openai'
  | 'deepseek'
  | 'zhipu'
  | 'kimi'
  | 'minimax'
  | 'siliconflow'
  | 'custom'

export interface ProviderConfig {
  apiKey: string
  model: string
  baseUrl: string
}

interface AIStore {
  provider: AIProviderType
  apiKey: string
  baseUrl: string
  model: string
  configs: Partial<Record<AIProviderType, ProviderConfig>>
  setProvider: (provider: AIProviderType) => void
  setApiKey: (key: string) => void
  setBaseUrl: (url: string) => void
  setModel: (model: string) => void
  setConfigs: (configs: Partial<Record<AIProviderType, ProviderConfig>>) => void
  setProviderConfig: (provider: AIProviderType, config: Partial<ProviderConfig>) => void
}

export const useAIStore = create<AIStore>((set, get) => ({
  provider: 'claude',
  apiKey: '',
  baseUrl: '',
  model: '',
  configs: {},
  setProvider: (provider) => {
    const saved = get().configs[provider]
    set({
      provider,
      apiKey: saved?.apiKey ?? '',
      model: saved?.model ?? '',
      baseUrl: saved?.baseUrl ?? ''
    })
  },
  setApiKey: (apiKey) => set({ apiKey }),
  setBaseUrl: (baseUrl) => set({ baseUrl }),
  setModel: (model) => set({ model }),
  setConfigs: (configs) => set({ configs }),
  setProviderConfig: (provider, config) => {
    const prev = get().configs
    const existing = prev[provider] ?? { apiKey: '', model: '', baseUrl: '' }
    set({ configs: { ...prev, [provider]: { ...existing, ...config } } })
  }
}))
