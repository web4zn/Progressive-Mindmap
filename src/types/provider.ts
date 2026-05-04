export interface Model {
  id: string
  name: string
  enabled: boolean
}

export interface Provider {
  id: string
  name: string
  apiEndpoint: string
  apiKey: string
  models: Model[]
  supportsJsonMode: boolean
  createdAt: number
  updatedAt: number
}
