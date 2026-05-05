import { useState, useCallback, useRef } from 'react'
import {
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  Settings,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useConversationStore } from '@/stores/conversationStore'
import { useProviderStore } from '@/stores/providerStore'
import { useChatStore } from '@/stores/chatStore'

import { createClient } from '@/lib/llm-client'
import {
  generateMindmap,
  parseJsonToTree,
  validateTree,
  parseOperations,
  applyOperations,
  buildEditedNodeIdSet,
} from '@/lib/mindmap-generator'
import type { CorpusEntry, MindMapNode, ValidationWarning } from '@/types/mindmap'

function findEditedNodes(nodes: MindMapNode[]): MindMapNode[] {
  const result: MindMapNode[] = []
  for (const node of nodes) {
    if (node.editedByUser) result.push(node)
    result.push(...findEditedNodes(node.children))
  }
  return result
}

function mergeEditedNodes(newTree: MindMapNode[], editedNodes: MindMapNode[]): MindMapNode[] {
  const editedIds = new Set(editedNodes.map((n) => n.id))
  return newTree.map((node) => {
    if (editedIds.has(node.id)) {
      const edited = editedNodes.find((n) => n.id === node.id)
      return edited ?? node
    }
    return { ...node, children: mergeEditedNodes(node.children, editedNodes) }
  })
}
import { exportMindmapAsMarkdown, downloadMarkdown } from '@/lib/export'
import MindMapTree from '@/features/mindmap/MindMapTree'

interface MindMapPanelProps {
  onClose: () => void
}

export default function MindMapPanel({ onClose }: MindMapPanelProps) {
  const {
    mindmaps,
    activeMindmapId,
    setActiveMindmapId,
    updateMindmapTree,
    updateMindmapSettings,
  } = useMindmapStore()
  const { conversations } = useConversationStore()
  const { providers } = useProviderStore()
  const { startGeneration, stopGeneration } = useChatStore()

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [corpusOpen, setCorpusOpen] = useState(true)
  const [reasoningContent, setReasoningContent] = useState('')
  const [reasoningOpen, setReasoningOpen] = useState(true)
  const [progressText, setProgressText] = useState('')
  const [streamingTree, setStreamingTree] = useState<MindMapNode[] | null>(null)
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [corpusDeleteEntry, setCorpusDeleteEntry] = useState<{ entryId: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const activeMindmap = mindmaps.find((m) => m.id === activeMindmapId) ?? null

  const activeConversation = conversations.find(
    (c) => c.id === useConversationStore.getState().activeConversationId,
  )

  const generatorProviderId = activeMindmap?.generatorProviderId ?? activeConversation?.providerId
  const generatorModelId = activeMindmap?.generatorModelId ?? activeConversation?.modelId ?? ''
  const generatorProvider = generatorProviderId
    ? (providers.find((p) => p.id === generatorProviderId) ?? null)
    : null

  const handleGenerate = useCallback(async () => {
    if (!activeMindmap || !activeMindmapId) return

    const hasCorpus = activeMindmap.corpus && activeMindmap.corpus.length > 0

    if (!hasCorpus) {
      setError('图谱中暂无语料内容，请先添加语料')
      return
    }
    if (!generatorProvider || !generatorModelId) {
      setError('未配置生成模型，请在图谱设置中指定')
      return
    }

    setError(null)
    setGenerating(true)
    const controller = startGeneration()
    abortRef.current = controller

    try {
      const client = createClient(generatorProvider)
      let fullContent = ''
      const configDepth = activeMindmap.maxDepth ?? 3
      const effectiveDepth = configDepth === 0 ? 6 : configDepth
      const mode =
        activeMindmap.forceFullRebuild === true ||
        (activeMindmap.tree ?? []).length === 0 ||
        activeMindmap.lastGeneratedAt == null
          ? 'full'
          : 'incremental'
      const corpusForGeneration =
        mode === 'incremental'
          ? (activeMindmap.corpus ?? []).filter(
              (e) => !activeMindmap.lastGeneratedAt || e.addedAt > activeMindmap.lastGeneratedAt,
            )
          : (activeMindmap.corpus ?? [])
      setReasoningContent('')
      setReasoningOpen(true)
      setProgressText('')
      setStreamingTree(null)

      let sourceMap:
        | Map<string, { conversationId: string; messageId: string; text: string }>
        | undefined

      for await (const chunk of generateMindmap(
        client,
        activeMindmap,
        corpusForGeneration,
        conversations,
        generatorModelId,
        controller.signal,
        mode,
      )) {
        if (typeof chunk === 'object' && chunk !== null && 'sourceMap' in chunk) {
          sourceMap = (
            chunk as {
              sourceMap: Map<string, { conversationId: string; messageId: string; text: string }>
            }
          ).sourceMap
          continue
        }
        if (typeof chunk === 'object' && chunk !== null && 'reasoning' in chunk) {
          const reasoningChunk = chunk as { reasoning: string }
          setReasoningContent((prev) => prev + reasoningChunk.reasoning)
          continue
        }
        if (typeof chunk === 'object' && chunk !== null && 'incrementalResult' in chunk) {
          continue
        }
        fullContent += chunk as string
      }

      if (mode === 'incremental') {
        const operations = parseOperations(fullContent)
        if (operations === null) {
          const tree = parseJsonToTree(fullContent, sourceMap, effectiveDepth)
          updateMindmapTree(activeMindmapId, tree)
          setStreamingTree(null)
          setError('增量生成失败，已使用全量模式')
          const warnings = validateTree(tree, effectiveDepth)
          setValidationWarnings(warnings)
        } else {
          const editedIds = buildEditedNodeIdSet(activeMindmap.tree)
          const { newTree, changes } = applyOperations(activeMindmap.tree, operations, editedIds)
          updateMindmapTree(activeMindmapId, newTree)
          setStreamingTree(null)
          setProgressText(`更新了 ${changes.length} 个节点`)
          const warnings = validateTree(newTree, effectiveDepth)
          setValidationWarnings(warnings)
        }
      } else {
        const tree = parseJsonToTree(fullContent, sourceMap, effectiveDepth)

        // Check for user-edited nodes and preserve them
        const editedNodes = findEditedNodes(activeMindmap.tree)
        if (editedNodes.length > 0) {
          const merged = mergeEditedNodes(tree, editedNodes)
          updateMindmapTree(activeMindmapId, merged)
          setValidationWarnings([
            ...validateTree(merged, effectiveDepth),
            {
              type: 'duplicate' as const,
              nodeLabel: '',
              message: `保留了 ${editedNodes.length} 个手动编辑的节点`,
            },
          ])
        } else {
          updateMindmapTree(activeMindmapId, tree)
        }

        setStreamingTree(null)
        updateMindmapSettings(activeMindmapId, { lastGeneratedAt: Date.now() })
        const warnings = validateTree(tree, effectiveDepth)
        setValidationWarnings(warnings)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      const message = err instanceof Error ? err.message : '生成失败'
      const isPreset = generatorProvider?.preset && !generatorProvider?.apiKey
      const hint = isPreset
        ? '\n\n提示：OpenRouter 免费模型需要配置 API Key，前往 openrouter.ai 注册获取（免费）'
        : generatorProvider?.preset
          ? '\n\n提示：免费模型有限制，可切换其他免费模型或添加自己的 API Key'
          : ''
      setError(message + hint)
    } finally {
      setGenerating(false)
      stopGeneration()
      abortRef.current = null
    }
  }, [
    activeMindmap,
    activeMindmapId,
    conversations,
    generatorProvider,
    generatorModelId,
    startGeneration,
    stopGeneration,
    updateMindmapTree,
    updateMindmapSettings,
  ])

  const handleExport = useCallback(() => {
    if (!activeMindmap) return
    const md = exportMindmapAsMarkdown(activeMindmap)
    downloadMarkdown(md, activeMindmap.title)
  }, [activeMindmap])

  const handleAddCurrentConversation = useCallback(() => {
    if (!activeMindmap || !activeMindmapId) return
    const conv = activeConversation
    if (!conv) return
    const existingIds = new Set((activeMindmap.corpus ?? []).map((e) => e.messageId))
    const entries: CorpusEntry[] = conv.messages
      .filter(
        (m) => m.role === 'assistant' && m.content.trim().length > 0 && !existingIds.has(m.id),
      )
      .map((m) => ({
        id: crypto.randomUUID(),
        messageId: m.id,
        selectedText: undefined,
        note: undefined,
        enabled: true,
        addedAt: Date.now(),
      }))
    if (entries.length === 0) return
    useMindmapStore.getState().addBatchCorpusEntries(activeMindmapId, entries)
  }, [activeMindmap, activeMindmapId, activeConversation])

  const fullscreenClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col bg-background'
    : 'h-full flex flex-col border-l bg-sidebar text-sidebar-foreground'

  return (
    <div className={fullscreenClass}>
      <div className="p-3 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <Select
            value={activeMindmapId ?? ''}
            onValueChange={(v) => setActiveMindmapId(v || null)}
          >
            <SelectTrigger size="sm" className="flex-1">
              <SelectValue placeholder="选择图谱...">
                {activeMindmap?.title ?? '选择图谱...'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {mindmaps.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">暂无图谱</div>
              ) : (
                mindmaps.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
            title="关闭面板"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {activeMindmap && (
          <div className="flex items-center gap-1 flex-nowrap overflow-hidden">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={handleGenerate}
              disabled={generating}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">更新图谱</span>
            </Button>
            <select
              aria-label="最大深度"
              className="h-7 rounded border border-sidebar-border/40 bg-transparent text-xs px-1.5 text-sidebar-foreground/70"
              value={activeMindmap?.maxDepth ?? 3}
              onChange={(e) =>
                updateMindmapSettings(activeMindmapId!, { maxDepth: Number(e.target.value) })
              }
            >
              <option value={3}>3层</option>
              <option value={4}>4层</option>
              <option value={5}>5层</option>
              <option value={0}>自动</option>
            </select>
            <button
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors shrink-0 whitespace-nowrap"
              onClick={handleExport}
              title="导出"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">导出</span>
            </button>
            <button
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors shrink-0 whitespace-nowrap ml-auto"
              onClick={() => setSettingsOpen(true)}
              title="图谱设置"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {activeMindmap && (
        <div className="border-t border-sidebar-border pt-2 px-3">
          <button
            className="flex items-center gap-1 text-xs font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground w-full"
            onClick={() => setCorpusOpen((o) => !o)}
          >
            {corpusOpen ? (
              <ChevronDown className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 shrink-0" />
            )}
            语料库 ({(activeMindmap.corpus ?? []).filter((e) => e.enabled).length}/
            {(activeMindmap.corpus ?? []).length})
            <button
              className="ml-auto inline-flex items-center gap-0.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                handleAddCurrentConversation()
              }}
              title="将当前对话的 AI 回答加入语料库"
            >
              <BookmarkPlus className="w-3 h-3" />
              加入当前对话
            </button>
          </button>
          {corpusOpen && (
            <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
              {(() => {
                const msgConvMap = new Map<string, (typeof conversations)[number]>()
                for (const c of conversations) {
                  for (const m of c.messages) {
                    msgConvMap.set(m.id, c)
                  }
                }
                const groupMap = new Map<
                  string,
                  { conversation: (typeof conversations)[number] | null; entries: CorpusEntry[] }
                >()
                for (const entry of activeMindmap.corpus ?? []) {
                  const conv = msgConvMap.get(entry.messageId) ?? null
                  const key = conv?.id ?? '__orphan__'
                  if (!groupMap.has(key)) {
                    groupMap.set(key, { conversation: conv, entries: [] })
                  }
                  groupMap.get(key)!.entries.push(entry)
                }
                const groups = Array.from(groupMap.values())
                if (groups.length === 0) {
                  return (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      暂无语料，从对话中选择内容加入语料库
                    </p>
                  )
                }
                return groups.map((group) => (
                  <div key={group.conversation?.id ?? '__orphan__'}>
                    {group.conversation && (
                      <div className="text-xs font-medium text-sidebar-foreground/50 px-1 py-0.5 truncate">
                        {group.conversation.title}
                      </div>
                    )}
                    {group.entries.map((entry) => {
                      const msg = group.conversation?.messages.find((m) => m.id === entry.messageId)
                      const displayText = entry.selectedText ?? msg?.content.slice(0, 60) ?? ''
                      let qPrefix = ''
                      if (msg && msg.role === 'assistant' && group.conversation) {
                        const msgIndex = group.conversation.messages.indexOf(msg)
                        const prevMsg =
                          msgIndex > 0 ? group.conversation.messages[msgIndex - 1] : null
                        if (prevMsg && prevMsg.role === 'user') {
                          qPrefix = prevMsg.content.slice(0, 24)
                        }
                      }
                      const isDeleted = !msg
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-sidebar-accent/30 group/entry"
                        >
                          <span
                            className={`text-xs truncate flex-1 ${isDeleted ? 'text-muted-foreground/50 italic' : ''}`}
                            title={displayText}
                          >
                            {isDeleted && (
                              <span className="text-muted-foreground/50">来源已删除 · </span>
                            )}
                            {qPrefix && (
                              <span className="text-sidebar-foreground/40">{qPrefix} → </span>
                            )}
                            {displayText}
                          </span>
                          {entry.note && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                              title={entry.note}
                            />
                          )}
                          <button
                            className="opacity-0 group-hover/entry:opacity-100 transition-opacity p-0.5 rounded text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            onClick={() => {
                              if (entry.enabled) {
                                useMindmapStore
                                  .getState()
                                  .toggleCorpusEntry(activeMindmap.id, entry.id, false)
                              } else {
                                useMindmapStore
                                  .getState()
                                  .toggleCorpusEntry(activeMindmap.id, entry.id, true)
                              }
                            }}
                            title={entry.enabled ? '禁用' : '启用'}
                          >
                            {entry.enabled ? (
                              <ToggleRight className="w-3.5 h-3.5" />
                            ) : (
                              <ToggleLeft className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            className="opacity-0 group-hover/entry:opacity-100 transition-opacity p-0.5 rounded text-sidebar-foreground/50 hover:text-red-400 hover:bg-sidebar-accent/50"
                            onClick={() => {
                              setCorpusDeleteEntry({ entryId: entry.id })
                            }}
                            title="删除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      )}

      {generating && progressText && (
        <div className="px-3 py-1.5 text-xs text-sidebar-foreground/70 bg-sidebar-accent/30 border-b border-sidebar-border">
          {progressText}
        </div>
      )}

      {generating && reasoningContent && (
        <div className="border-b border-sidebar-border">
          <button
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground w-full"
            onClick={() => setReasoningOpen((o) => !o)}
          >
            {reasoningOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            AI 思考过程
          </button>
          {reasoningOpen && (
            <div className="px-3 pb-2 text-xs text-sidebar-foreground/50 max-h-32 overflow-y-auto whitespace-pre-wrap">
              {reasoningContent}
            </div>
          )}
        </div>
      )}

      <MindMapTree
        tree={streamingTree ?? activeMindmap?.tree ?? []}
        mindmapId={activeMindmapId ?? undefined}
        isGenerating={generating}
        isStreaming={streamingTree !== null}
        error={error}
        onRetry={() => handleGenerate()}
      />

      {validationWarnings.length > 0 && !generating && (
        <div className="border-t border-sidebar-border px-3 py-2">
          <p className="text-xs font-medium text-amber-500 mb-1">
            质量提醒 ({validationWarnings.length})
          </p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {validationWarnings.map((w, i) => (
              <div key={i} className="text-xs text-amber-600/80">
                {w.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <MindmapSettingsDialog
        key={activeMindmap?.id ?? 'none'}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        mindmap={activeMindmap}
        onSave={(settings) => {
          if (activeMindmapId) {
            updateMindmapSettings(activeMindmapId, settings)
          }
        }}
      />

      <Dialog
        open={corpusDeleteEntry !== null}
        onOpenChange={(open) => {
          if (!open) setCorpusDeleteEntry(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">确认删除此条语料？</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCorpusDeleteEntry(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (corpusDeleteEntry && activeMindmap) {
                  useMindmapStore
                    .getState()
                    .removeCorpusEntry(activeMindmap.id, corpusDeleteEntry.entryId)
                }
                setCorpusDeleteEntry(null)
              }}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MindmapSettingsDialog({
  open,
  onOpenChange,
  mindmap,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mindmap: ReturnType<typeof useMindmapStore.getState>['mindmaps'][number] | null
  onSave: (settings: {
    generatorProviderId?: string
    generatorModelId?: string
    maxDepth?: number
    forceFullRebuild?: boolean
  }) => void
}) {
  const { providers } = useProviderStore()
  const { conversations } = useConversationStore()
  const [useCustom, setUseCustom] = useState(
    !!mindmap?.generatorProviderId && !!mindmap?.generatorModelId,
  )
  const [selectedProviderId, setSelectedProviderId] = useState(
    mindmap?.generatorProviderId ?? providers[0]?.id ?? '',
  )
  const [selectedModelId, setSelectedModelId] = useState(mindmap?.generatorModelId ?? '')
  const [monitoredIds, setMonitoredIds] = useState<string[]>(
    mindmap?.monitoredConversationIds ?? [],
  )
  const [maxDepth, setMaxDepth] = useState(mindmap?.maxDepth ?? 3)
  const [forceFullRebuild, setForceFullRebuild] = useState(mindmap?.forceFullRebuild ?? false)

  const selectedProvider = providers.find((p) => p.id === selectedProviderId)
  const enabledModels = selectedProvider?.models.filter((m) => m.enabled) ?? []

  const handleSave = () => {
    onSave({
      maxDepth,
      forceFullRebuild,
      ...(useCustom && selectedProviderId && selectedModelId
        ? { generatorProviderId: selectedProviderId, generatorModelId: selectedModelId }
        : { generatorProviderId: undefined, generatorModelId: undefined }),
    })

    // Sync monitored conversations
    if (mindmap) {
      const original = mindmap.monitoredConversationIds ?? []
      const store = useMindmapStore.getState()
      for (const id of original) {
        if (!monitoredIds.includes(id)) {
          store.removeMonitoredConversation(mindmap.id, id)
        }
      }
      for (const id of monitoredIds) {
        if (!original.includes(id)) {
          store.addMonitoredConversation(mindmap.id, id)
        }
      }
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>图谱生成设置</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">指定专用生成模型</span>
          </label>
          <p className="text-xs text-muted-foreground">不勾选时使用当前对话的模型生成图谱</p>

          {useCustom && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">模型提供商</label>
                <select
                  title="模型提供商"
                  value={selectedProviderId}
                  onChange={(e) => {
                    setSelectedProviderId(e.target.value)
                    setSelectedModelId('')
                  }}
                  className="mt-1 w-full h-8 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">模型</label>
                <select
                  title="模型"
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="mt-1 w-full h-8 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">请选择模型</option>
                  {enabledModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name ?? m.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="border-t pt-4">
          <label className="text-sm font-medium" htmlFor="settings-max-depth">
            最大深度
          </label>
          <select
            id="settings-max-depth"
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            className="mt-1 w-full h-8 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value={3}>3层</option>
            <option value={4}>4层</option>
            <option value={5}>5层</option>
            <option value={0}>自动</option>
          </select>
        </div>
        <div className="border-t pt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={forceFullRebuild}
              onChange={(e) => setForceFullRebuild(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">强制全量重建</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            勾选后每次生成都会重新构建完整图谱而非增量更新
          </p>
        </div>
        <div className="border-t pt-4">
          <label className="text-sm font-medium">监听对话（新回答自动加入语料库）</label>
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无对话</p>
            ) : (
              conversations.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={monitoredIds.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMonitoredIds((prev) => [...prev, c.id])
                      } else {
                        setMonitoredIds((prev) => prev.filter((id) => id !== c.id))
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-xs truncate">{c.title}</span>
                </label>
              ))
            )}
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={useCustom && !selectedModelId}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
