import type { Message } from './message'

export interface Conversation {
  id: string
  title: string
  providerId: string
  modelId: string
  systemPrompt: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}
