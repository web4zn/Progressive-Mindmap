import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface MessageInputProps {
  onSend: (content: string) => void
  onStop?: () => void
  isGenerating?: boolean
  disabled?: boolean
}

export default function MessageInput({
  onSend,
  onStop,
  isGenerating,
  disabled,
}: MessageInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 6 * 24) + 'px'
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isGenerating) {
        handleSend()
      }
    }
  }

  return (
    <div className="flex items-end gap-2 p-4 border-t bg-background shadow-[0_-1px_3px_-1px_rgba(0,0,0,0.05)]">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? '请先配置模型提供商...' : '输入消息开始对话... (Shift+Enter 换行)'}
        className="min-h-[40px] max-h-[144px] resize-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
        disabled={disabled || isGenerating}
        rows={1}
      />
      {isGenerating ? (
        <Button
          onClick={onStop}
          size="icon"
          className="shrink-0"
          variant="destructive"
          title="停止生成"
        >
          <Square className="w-4 h-4" fill="currentColor" />
        </Button>
      ) : (
        <Button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          size="icon"
          className="shrink-0"
          title="发送"
        >
          <Send className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
