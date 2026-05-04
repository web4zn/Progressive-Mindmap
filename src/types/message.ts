export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error'

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  status: MessageStatus
}
