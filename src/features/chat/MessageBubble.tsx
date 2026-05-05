import { useRef } from 'react'
import { Copy, RefreshCw, BookmarkPlus } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Avatar from '@/components/Avatar'
import { useMindmapStore } from '@/stores/mindmapStore'
import type { Message } from '@/types/message'
import type { CorpusEntry } from '@/types/mindmap'

interface MessageBubbleProps {
  message: Message
  conversationId: string
  onRegenerate?: () => void
}

export default function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'

  const pendingSelectionRef = useRef<string | null>(null)

  const time = new Date(message.createdAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }

  const handleCorpusMouseDown = () => {
    const selection = window.getSelection()
    const text = selection && selection.toString().trim()
    pendingSelectionRef.current = text && text.length > 0 ? text : null
  }

  const handleAddToCorpus = () => {
    const activeMindmapId = useMindmapStore.getState().activeMindmapId
    if (!activeMindmapId) return

    const selectedText = pendingSelectionRef.current
    pendingSelectionRef.current = null

    const mindmap = useMindmapStore.getState().mindmaps.find((m) => m.id === activeMindmapId)
    if (!selectedText && mindmap) {
      const alreadyAdded = (mindmap.corpus ?? []).some((e) => e.messageId === message.id)
      if (alreadyAdded) return
    }

    let range: { start: number; end: number } | undefined
    if (selectedText) {
      const start = message.content.indexOf(selectedText)
      if (start !== -1) {
        range = { start, end: start + selectedText.length }
      }
    }

    const entry: CorpusEntry = {
      id: crypto.randomUUID(),
      messageId: message.id,
      selectedText: selectedText || undefined,
      range,
      enabled: true,
      addedAt: Date.now(),
    }

    useMindmapStore.getState().addCorpusEntry(activeMindmapId, entry)
  }

  return (
    <div className={`flex gap-3 mb-4 message-enter ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar type={isUser ? 'user' : 'ai'} userInitial="我" />

      <div
        className={`max-w-[75%] lg:max-w-[60%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground/60">{time}</span>
        </div>

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-md'
              : isError
                ? 'bg-destructive/10 border border-destructive/30 rounded-tl-md'
                : 'bg-muted rounded-tl-md prose prose-sm dark:prose-invert max-w-none'
          }`}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <Markdown remarkPlugins={[remarkGfm]}>{message.content || ''}</Markdown>
          )}
          {isStreaming && (
            <span className="inline-flex items-center gap-1 ml-1">
              <span className="streaming-indicator">
                <span />
                <span />
                <span />
              </span>
            </span>
          )}
        </div>

        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
            onClick={handleCopy}
            title="复制"
          >
            <Copy className="w-3 h-3" />
          </button>
          {!isUser && message.status === 'complete' && (
            <button
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
              onMouseDown={handleCorpusMouseDown}
              onClick={handleAddToCorpus}
              title="加入语料库"
            >
              <BookmarkPlus className="w-3 h-3" />
            </button>
          )}
          {!isUser && onRegenerate && (
            <button
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
              onClick={onRegenerate}
              title="重新生成"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
