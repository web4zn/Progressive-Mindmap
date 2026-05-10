import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useConversationStore } from '@/stores/conversationStore'
import { useChatStore } from '@/stores/chatStore'
import { useProviderStore } from '@/stores/providerStore'
import ModelSelector from '@/features/chat/ModelSelector'
import { AgentActivityPanel } from '@/features/chat/AgentActivityPanel'

interface ChatInputPanelProps {
  onSend: (content: string) => void
  onStop?: () => void
  isGenerating?: boolean
  disabled?: boolean
}

export default function ChatInputPanel({
  onSend,
  onStop,
  isGenerating,
  disabled,
}: ChatInputPanelProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeConversationId = useConversationStore((s) => s.activeConversationId)
  const conversations = useConversationStore((s) => s.conversations)
  const updateConversation = useConversationStore((s) => s.updateConversation)
  const providers = useProviderStore((s) => s.providers)
  const stopGeneration = useChatStore((s) => s.stopGeneration)
  const agentStatus = useChatStore((s) => s.agentStatus)
  const agentMessage = useChatStore((s) => s.agentMessage)

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const agentMode = activeConversation?.agentMode ?? 'enhance'
  const hasProviders = providers.length > 0

  // 校验当前 model 是否可用
  const activeProvider = activeConversation
    ? providers.find((p) => p.id === activeConversation.providerId)
    : null
  const hasValidModel =
    activeProvider && activeConversation
      ? activeProvider.models.some((m) => m.id === activeConversation.modelId && m.enabled)
      : false

  const effectiveDisabled = disabled || !hasProviders || !activeConversation || !hasValidModel || activeConversation?.archived === true

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
    if (!trimmed || effectiveDisabled) return
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

  const handleSetAgentMode = (mode: 'enhance' | 'mediate') => {
    if (!activeConversation) return
    if (mode === 'enhance') {
      stopGeneration()
    }
    updateConversation(activeConversation.id, { agentMode: mode })
  }

  return (
    <div className="border-t bg-background shadow-[0_-1px_3px_-1px_rgba(0,0,0,0.05)]">
      {/* 控制行 — ModelSelector + Agent mode toggle */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 gap-2">
        <ModelSelector />
        <div className="flex items-center border rounded-md overflow-hidden text-xs shrink-0">
          <button
            onClick={() => handleSetAgentMode('enhance')}
            className={`px-2 py-1 transition-colors ${
              agentMode === 'enhance' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            ✨ 增强
          </button>
          <button
            onClick={() => handleSetAgentMode('mediate')}
            className={`px-2 py-1 transition-colors ${
              agentMode === 'mediate' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            🤖 Agent
          </button>
        </div>
      </div>

      {/* 输入行 — textarea + send/stop */}
      <div className="flex items-end gap-2 px-4 pb-4 pt-1">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            effectiveDisabled
              ? '请先配置模型提供商...'
              : '输入消息开始对话... (Shift+Enter 换行)'
          }
          className="min-h-[40px] max-h-[144px] resize-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
          disabled={effectiveDisabled || isGenerating}
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
            disabled={effectiveDisabled || !value.trim()}
            size="icon"
            className="shrink-0"
            title="发送"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Agent 活动指示器 — 增强模式且非 idle 时显示 */}
      {agentMode === 'enhance' && (
        <AgentActivityPanel status={agentStatus} message={agentMessage} />
      )}
    </div>
  )
}
