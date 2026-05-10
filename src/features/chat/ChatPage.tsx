import { useState, useCallback, useEffect } from 'react'
import { MessageSquare, Settings, PanelLeft, X, Network, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useConversationStore } from '@/stores/conversationStore'
import { useProviderStore } from '@/stores/providerStore'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useConversation } from '@/hooks/useConversation'
import { useMindmapAgent } from '@/hooks/useMindmapAgent'
import ChatInputPanel from '@/features/chat/ChatInputPanel'
import { generateId } from '@/lib/id'
import ConversationSidebar, {
  ConversationSettingsDialog,
} from '@/features/conversation/ConversationSidebar'
import ProviderSettingsPage from '@/features/provider/ProviderSettingsPage'
import MessageList from '@/features/chat/MessageList'
import EmptyState from '@/components/EmptyState'
import NewConversationDialog from '@/features/chat/NewConversationDialog'
import type { NewConversationResult } from '@/features/chat/NewConversationDialog'
import MindMapPanel from '@/features/mindmap/MindMapPanel'

type View = 'chat' | 'providers'

export default function ChatPage() {
  const [view, setView] = useState<View>('chat')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newConvDialogOpen, setNewConvDialogOpen] = useState(false)
  const [mindmapCollapsed, setMindmapCollapsed] = useState(false)

  const conversations = useConversationStore((s) => s.conversations)
  const activeConversationId = useConversationStore((s) => s.activeConversationId)
  const addConversation = useConversationStore((s) => s.addConversation)
  const removeLastAssistantMessage = useConversationStore((s) => s.removeLastAssistantMessage)

  const providers = useProviderStore((s) => s.providers)

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const hasProviders = providers.length > 0

  // ── 使用抽取的 Chat Hook ──
  const agent = useMindmapAgent()
  const { sendMessage, stopGeneration, isGenerating } = useConversation({
    onStreamComplete: (convId, _msgId) => {
      // AI 回答完成后 → 触发 Agent 后台增强
      agent.enhanceMessage(convId)
    },
  })

  // ── 初始化 Agent (有活跃会话且有 provider 时) ──
  useEffect(() => {
    if (hasProviders && activeConversation) {
      agent.initialize()
    }
  }, [hasProviders, activeConversation, agent])

  // ── 发送消息 ──
  const handleSend = useCallback(
    (content: string) => {
      if (!activeConversation) return

      // 实时从 store 读取 agentMode，避免 useCallback 闭包缓存旧值
      const { agentMode } = useConversationStore.getState().conversations.find(
        (c) => c.id === activeConversation.id,
      ) ?? { agentMode: 'enhance' as const }
      const currentAgentMode = agentMode ?? 'enhance'

      if (currentAgentMode === 'mediate') {
        stopGeneration()
        const store = useConversationStore.getState()
        store.addMessageToConversation(activeConversation.id, {
          id: generateId(),
          role: 'user',
          content,
          createdAt: Date.now(),
          status: 'complete',
        })
        store.addMessageToConversation(activeConversation.id, {
          id: generateId(),
          role: 'assistant',
          content: '',
          createdAt: Date.now(),
          status: 'streaming',
        })
        agent.mediateMessage(content, activeConversation.id)
      } else {
        sendMessage(content, activeConversation.id)
      }
    },
    [activeConversation, agent, sendMessage, stopGeneration],
  )

  // ── 重新生成 ──
  const handleRegenerate = useCallback(async () => {
    if (isGenerating) return
    const convId = activeConversation?.id
    if (!convId) return
    const state = useConversationStore.getState()
    const conv = state.conversations.find((c) => c.id === convId)
    if (!conv) return
    const lastMsg = conv.messages[conv.messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant') return
    const lastUserMsg = [...conv.messages].reverse().find((m) => m.role === 'user')
    removeLastAssistantMessage(convId)

    if (!lastUserMsg) return

    // 根据当前模式选择路径
    const currentConv = useConversationStore.getState().conversations.find(
      (c) => c.id === convId,
    )
    const agentMode = currentConv?.agentMode ?? 'enhance'

    if (agentMode === 'mediate') {
      // Agent 模式：通过 Worker 重新生成
      const store = useConversationStore.getState()
      store.addMessageToConversation(convId, {
        id: generateId(),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'streaming',
      })
      agent.mediateMessage(lastUserMsg.content, convId)
    } else {
      sendMessage(lastUserMsg.content, convId)
    }
  }, [activeConversation, isGenerating, removeLastAssistantMessage, sendMessage, agent])

  // ── 新建会话 ──
  const handleNewConversation = () => {
    const p = providers[0]
    if (!p) return
    setNewConvDialogOpen(true)
  }

  const handleNewConvSubmit = (_result: NewConversationResult) => {
    const p = providers[0]
    if (!p) return
    const modelId = p.models.find((m) => m.enabled)?.id ?? p.models[0]?.id ?? ''
    const conv = addConversation({
      providerId: p.id,
      modelId,
    })

    const mindmapId = _result.mindmapId
    if (mindmapId) {
      useMindmapStore.getState().addMonitoredConversation(mindmapId, conv.id)
    }

    if (_result.newMindmapTitle) {
      const mm = useMindmapStore.getState().addMindmap(_result.newMindmapTitle, _result.pattern)
      useMindmapStore.getState().addMonitoredConversation(mm.id, conv.id)
    }

    setView('chat')
  }

  // ── Provider 设置页 ──
  if (view === 'providers') {
    return <ProviderSettingsPage onBack={() => setView('chat')} />
  }

  // ── 主内容渲染 ──
  const renderContent = () => {
    if (!hasProviders) {
      return (
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex items-center justify-center min-w-0">
            <EmptyState
              icon={<MessageSquare className="w-16 h-16" />}
              title="欢迎使用 LLM Chat"
              description="请配置模型提供商开始 AI 对话"
              actions={<Button onClick={() => setView('providers')}>配置模型提供商</Button>}
              footer={
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">流行模型推荐</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['OpenAI', 'DeepSeek', 'Ollama', 'SiliconFlow'].map((name) => (
                      <Badge key={name} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              }
            />
          </div>
          {!mindmapCollapsed && (
            <>
              <div className="w-px bg-border shrink-0 hidden md:block" />
              <div className="flex-1 h-full hidden md:block min-w-[300px]">
                <MindMapPanel onClose={() => setMindmapCollapsed(true)} />
              </div>
            </>
          )}
        </div>
      )
    }

    if (!activeConversation) {
      return (
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex items-center justify-center min-w-0">
            <EmptyState
              icon={<MessageSquare className="w-12 h-12" />}
              title="开始新对话"
              description="选择一个模型并发送消息开始聊天"
              actions={<Button onClick={handleNewConversation}>新建对话</Button>}
            />
          </div>
          {!mindmapCollapsed && (
            <>
              <div className="w-px bg-border shrink-0 hidden md:block" />
              <div className="flex-1 h-full hidden md:block min-w-[300px]">
                <MindMapPanel onClose={() => setMindmapCollapsed(true)} />
              </div>
            </>
          )}
        </div>
      )
    }

    return (
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0 max-w-lg">
          <div className="flex-1 min-h-0 relative">
            <MessageList
              messages={activeConversation.messages}
              conversationId={activeConversation.id}
              isGenerating={isGenerating}
              onRegenerate={handleRegenerate}
            />
          </div>
          <div className="shrink-0">
            <ChatInputPanel
              onSend={handleSend}
              onStop={stopGeneration}
              isGenerating={isGenerating}
              disabled={!hasProviders || !activeConversation || activeConversation.archived === true}
            />
          </div>
        </div>
        {!mindmapCollapsed && (
          <>
            <div className="w-px bg-border shrink-0 hidden md:block" />
            <div className="flex-1 h-full hidden md:block min-w-[300px]">
              <MindMapPanel onClose={() => setMindmapCollapsed(true)} />
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-full flex">
        <div
          className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-64 lg:w-72 shrink-0 h-full`}
        >
          <ConversationSidebar
            onOpenSettings={() => setView('providers')}
            onNewConversation={handleNewConversation}
          />
        </div>

        <div className="flex-1 flex flex-col h-full min-w-0">
          <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen((o) => !o)}
                title="切换侧边栏"
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              </Button>
              {activeConversation?.archived && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Archive className="w-3 h-3" />
                  已归档
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMindmapCollapsed((c) => !c)}
                title={mindmapCollapsed ? '打开脑图' : '关闭脑图'}
              >
                <Network className={`w-4 h-4 ${mindmapCollapsed ? 'text-muted-foreground' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                title="会话设置"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 flex min-h-0">{renderContent()}</div>
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
