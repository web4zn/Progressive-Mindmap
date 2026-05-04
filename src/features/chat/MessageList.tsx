import { useEffect, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import MessageBubble from './MessageBubble'
import type { Message } from '@/types/message'

interface MessageListProps {
  messages: Message[]
  conversationId?: string
  onRegenerate?: (messageId: string) => void
  isGenerating?: boolean
}

export default function MessageList({ messages, conversationId, onRegenerate, isGenerating }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: isGenerating ? 'instant' : 'smooth' })
    }
  }, [messages, autoScroll, isGenerating])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 100
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    setAutoScroll(atBottom)
  }

  if (messages.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center max-w-xs">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-foreground/80">发送消息开始对话</p>
          <p className="text-sm text-muted-foreground">输入你的问题，AI 将实时回复</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div ref={scrollRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto">
        <div className="p-4 space-y-1">
          {messages.map((msg) => (
            <div key={msg.id} className="group">
              <MessageBubble
                message={msg}
                conversationId={conversationId ?? ''}
                onRegenerate={msg.role === 'assistant' && msg.status !== 'streaming' && msg.status !== 'pending'
                  ? () => onRegenerate?.(msg.id)
                  : undefined
                }
              />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      {!autoScroll && isGenerating && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
              setAutoScroll(true)
            }}
          >
            滚动到最新 ↓
          </Button>
        </div>
      )}
    </>
  )
}
