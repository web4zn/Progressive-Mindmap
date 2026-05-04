import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { MessageSquare, Settings, PanelLeft, X, Network, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useConversationStore } from '@/stores/conversationStore'
import { useProviderStore } from '@/stores/providerStore'
import { useChatStore } from '@/stores/chatStore'
import { useMindmapStore } from '@/stores/mindmapStore'
import { createClient, streamChatWithRetry, isAbortError } from '@/lib/llm-client'
import { generateMindmap, parseJsonToTree } from '@/lib/mindmap-generator'
import ConversationSidebar, { ConversationSettingsDialog } from '@/features/conversation/ConversationSidebar'
import ProviderSettingsPage from '@/features/provider/ProviderSettingsPage'
import ModelSelector from '@/features/chat/ModelSelector'
import MessageList from '@/features/chat/MessageList'
import MessageInput from '@/features/chat/MessageInput'
import EmptyState from '@/components/EmptyState'
import NewConversationDialog from '@/features/chat/NewConversationDialog'
import type { NewConversationResult } from '@/features/chat/NewConversationDialog'
import MindMapPanel from '@/features/mindmap/MindMapPanel'
import { generateId } from '@/lib/id'

type View = 'chat' | 'providers'

export default function ChatPage() {
  const [view, setView] = useState<View>('chat')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newConvDialogOpen, setNewConvDialogOpen] = useState(false)
  const [mindmapCollapsed, setMindmapCollapsed] = useState(false)

  const genTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const conversations = useConversationStore(s => s.conversations)
  const activeConversationId = useConversationStore(s => s.activeConversationId)
  const addConversation = useConversationStore(s => s.addConversation)
  const addMessageToConversation = useConversationStore(s => s.addMessageToConversation)
  const updateMessageInConversation = useConversationStore(s => s.updateMessageInConversation)
  const removeLastAssistantMessage = useConversationStore(s => s.removeLastAssistantMessage)

  const providers = useProviderStore(s => s.providers)
  const isGenerating = useChatStore(s => s.isGenerating)
  const startGeneration = useChatStore(s => s.startGeneration)
  const stopGeneration = useChatStore(s => s.stopGeneration)
  const setError = useChatStore(s => s.setError)

  const activeConversation = conversations.find(c => c.id === activeConversationId)
  const hasProviders = providers.length > 0

  const activeProvider = activeConversation
    ? providers.find(p => p.id === activeConversation.providerId)
    : null
  const hasValidModel = activeProvider && activeConversation
    ? activeProvider.models.some(m => m.id === activeConversation.modelId && m.enabled)
    : false

  const doSend = useCallback(async (content: string, conversationId: string) => {
    const conv = useConversationStore.getState().conversations.find(c => c.id === conversationId)
    if (!conv) return
    const prov = useProviderStore.getState().providers.find(p => p.id === conv.providerId)
    if (!prov) return
    const modelOk = prov.models.some(m => m.id === conv.modelId && m.enabled)
    if (!modelOk) return
    const generating = useChatStore.getState().isGenerating
    if (generating) return

    const userMsg = {
      id: generateId(),
      role: 'user' as const,
      content,
      createdAt: Date.now(),
      status: 'complete' as const,
    }
    addMessageToConversation(conversationId, userMsg)

    const assistantMsg = {
      id: generateId(),
      role: 'assistant' as const,
      content: '',
      createdAt: Date.now(),
      status: 'streaming' as const,
    }
    addMessageToConversation(conversationId, assistantMsg)

    const controller = startGeneration()

    try {
      const client = createClient(prov)
      const history = conv.messages
        .concat(userMsg)
        .map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))

      if (conv.systemPrompt) {
        history.unshift({ role: 'system', content: conv.systemPrompt })
      }

      let fullContent = ''

      for await (const chunk of streamChatWithRetry(
        client,
        {
          model: conv.modelId,
          messages: history,
          signal: controller.signal,
        },
        1
      )) {
        fullContent += chunk
        updateMessageInConversation(conversationId, assistantMsg.id, { content: fullContent })
      }

      updateMessageInConversation(conversationId, assistantMsg.id, { content: fullContent, status: 'complete' })

      const allMindmaps = useMindmapStore.getState().mindmaps
      for (const mm of allMindmaps) {
        if (!mm.monitoredConversationIds?.includes(conversationId)) continue

        const entry = {
          id: generateId(),
          messageId: assistantMsg.id,
          enabled: true,
          addedAt: Date.now(),
        }
        useMindmapStore.getState().addCorpusEntry(mm.id, entry)

        const timers = genTimersRef.current
        const existing = timers.get(mm.id)
        if (existing) clearTimeout(existing)

        timers.set(
          mm.id,
          setTimeout(async () => {
            const stillGenerating = useChatStore.getState().isGenerating
            if (stillGenerating) return

            const mindmapState = useMindmapStore.getState().mindmaps.find(
              (m) => m.id === mm.id,
            )
            if (!mindmapState) return

            const linkedConvs = useConversationStore
              .getState()
              .conversations.filter((c) =>
                mindmapState.monitoredConversationIds?.includes(c.id),
              )

            const generatorProvId =
              mindmapState.generatorProviderId ??
              linkedConvs[0]?.providerId
            const generatorModel =
              mindmapState.generatorModelId ??
              linkedConvs[0]?.modelId
            if (!generatorProvId || !generatorModel) return

            const prov = useProviderStore
              .getState()
              .providers.find((p) => p.id === generatorProvId)
            if (!prov) return

            let toastId: string | number | undefined
            try {
              toastId = toast.loading(`正在为图谱「${mindmapState.title}」自动生成...`)
              const client = createClient(prov)
              let fullGenContent = ''

              for await (const chunk of generateMindmap(
                client,
                mindmapState,
                mindmapState.corpus,
                linkedConvs,
                generatorModel,
                undefined,
              )) {
                if (
                  typeof chunk === 'object' &&
                  chunk !== null &&
                  'sourceMap' in chunk
                )
                  continue
                fullGenContent += chunk as string
              }

              const tree = parseJsonToTree(fullGenContent)
              useMindmapStore
                .getState()
                .updateMindmapTree(mm.id, tree)
              toast.success(`图谱「${mindmapState.title}」已自动更新`, { id: toastId, duration: Infinity, cancel: { label: '✕', onClick: () => {} } })
            } catch {
              if (toastId !== undefined) {
                toast.error(`图谱「${mindmapState.title}」自动生成失败`, { id: toastId, duration: Infinity, cancel: { label: '✕', onClick: () => {} } })
              } else {
                toast.error(`图谱「${mindmapState.title}」自动生成失败`, { duration: Infinity, cancel: { label: '✕', onClick: () => {} } })
              }
              // silently fail for auto-generation
            }
          }, 5000),
        )
      }
    } catch (err: unknown) {
      if (isAbortError(err)) {
        updateMessageInConversation(conversationId, assistantMsg.id, { status: 'complete' })
      } else {
        const message = err instanceof Error ? err.message : '请求失败'
        updateMessageInConversation(conversationId, assistantMsg.id, { content: message, status: 'error' })
        setError(message)
      }
    } finally {
      stopGeneration()
    }
  }, [addMessageToConversation, updateMessageInConversation, removeLastAssistantMessage, startGeneration, stopGeneration, setError])

  const handleSend = useCallback((content: string) => {
    if (!activeConversation) return
    doSend(content, activeConversation.id)
  }, [activeConversation, doSend])

  const handleRegenerate = useCallback(async () => {
    if (isGenerating) return
    const convId = activeConversation?.id
    if (!convId) return
    const state = useConversationStore.getState()
    const conv = state.conversations.find(c => c.id === convId)
    if (!conv) return
    const lastMsg = conv.messages[conv.messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant') return
    const lastUserMsg = [...conv.messages].reverse().find(m => m.role === 'user')
    removeLastAssistantMessage(convId)
    if (lastUserMsg) {
      doSend(lastUserMsg.content, convId)
    }
  }, [activeConversation, isGenerating, removeLastAssistantMessage, doSend])

  const handleStopGeneration = () => {
    stopGeneration()
  }

  const handleNewConversation = () => {
    const p = providers[0]
    if (!p) return
    setNewConvDialogOpen(true)
  }

  const handleNewConvSubmit = (_result: NewConversationResult) => {
    const p = providers[0]
    if (!p) return
    const modelId = p.models.find(m => m.enabled)?.id ?? p.models[0]?.id ?? ''
    addConversation({
      providerId: p.id,
      modelId,
    })
    setView('chat')
  }

  if (view === 'providers') {
    return (
      <ProviderSettingsPage onBack={() => setView('chat')} />
    )
  }

  const renderContent = () => {
    if (!hasProviders) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<MessageSquare className="w-16 h-16" />}
            title="欢迎使用 LLM Chat"
            description="请配置模型提供商开始 AI 对话"
            actions={
              <Button onClick={() => setView('providers')}>
                配置模型提供商
              </Button>
            }
            footer={
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">流行模型推荐</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['OpenAI', 'DeepSeek', 'Ollama', 'SiliconFlow'].map(name => (
                    <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                  ))}
                </div>
              </div>
            }
          />
        </div>
      )
    }

    if (!activeConversation) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<MessageSquare className="w-12 h-12" />}
            title="开始新对话"
            description="选择一个模型并发送消息开始聊天"
            actions={
              <Button onClick={handleNewConversation}>
                新建对话
              </Button>
            }
          />
        </div>
      )
    }

    return (
      <div className="flex-1 flex min-w-0 min-h-0">
        <div className="flex flex-col min-h-0 min-w-0 w-full max-w-lg">
          <div className="flex-1 min-h-0 relative">
            <MessageList
              messages={activeConversation.messages}
              conversationId={activeConversation.id}
              isGenerating={isGenerating}
              onRegenerate={handleRegenerate}
            />
          </div>
          <div className="shrink-0">
            <MessageInput
              onSend={handleSend}
              onStop={handleStopGeneration}
              isGenerating={isGenerating}
              disabled={!hasProviders || !activeConversation || !hasValidModel || activeConversation.archived === true}
            />
          </div>
        </div>

        {!mindmapCollapsed ? (
          <>
            <div className="w-px bg-border shrink-0 hidden md:block" />
            <div className="flex-1 h-full hidden md:block min-w-[300px]">
              <MindMapPanel onClose={() => setMindmapCollapsed(true)} />
            </div>
          </>
        ) : (
          <button
            onClick={() => setMindmapCollapsed(false)}
            className="hidden md:flex items-center justify-center w-8 h-8 shrink-0 self-start mt-3 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="打开脑图"
          >
            <Network className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-full flex">
        <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-64 lg:w-72 shrink-0 h-full`}>
            <ConversationSidebar onOpenSettings={() => setView('providers')} onNewConversation={handleNewConversation} />
        </div>

        <div className="flex-1 flex flex-col h-full min-w-0">
          <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(o => !o)} title="切换侧边栏">
                {sidebarOpen ? <X className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              </Button>
              <ModelSelector />
              {activeConversation?.archived && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Archive className="w-3 h-3" />
                  已归档
                </Badge>
              )}
              {!hasValidModel && (
                <span className="text-sm text-destructive">当前模型不可用</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} title="会话设置">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {renderContent()}
        </div>
      </div>

      <NewConversationDialog
        open={newConvDialogOpen}
        onOpenChange={setNewConvDialogOpen}
        onSubmit={handleNewConvSubmit}
      />

      <ConversationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </TooltipProvider>
  )
}
