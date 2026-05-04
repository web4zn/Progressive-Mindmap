import { useState, useCallback } from 'react'
import { Plus, Search, Download, Pencil, Trash2, Settings, Network, MapPin, Archive, Undo2, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useConversationStore } from '@/stores/conversationStore'
import { useProviderStore } from '@/stores/providerStore'
import { useMindmapStore } from '@/stores/mindmapStore'
import { exportConversationAsMarkdown, downloadMarkdown } from '@/lib/export'

interface ConversationSidebarProps {
  onOpenSettings: () => void
  onNewConversation: () => void
}

export default function ConversationSidebar({ onOpenSettings, onNewConversation }: ConversationSidebarProps) {
  const { conversations, activeConversationId, removeConversation, archiveConversation, unarchiveConversation, setActiveConversationId, updateConversation } = useConversationStore()
  const { mindmaps, activeMindmapId, addMindmap, removeMindmap, setActiveMindmapId, updateMindmapTitle } = useMindmapStore()
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [mindmapDeleteId, setMindmapDeleteId] = useState<string | null>(null)
  const [mindmapEditingId, setMindmapEditingId] = useState<string | null>(null)
  const [mindmapEditTitle, setMindmapEditTitle] = useState('')
  const [newMindmapTitle, setNewMindmapTitle] = useState('')
  const [showNewMindmap, setShowNewMindmap] = useState(false)

  const filtered = search
    ? conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations

  const activeConversations = filtered.filter(c => c.archived !== true)
  const archivedConversations = filtered.filter(c => c.archived === true)

  const handleDelete = (id: string) => {
    removeConversation(id)
    setDeleteConfirm(null)
  }

  const handleArchive = (id: string) => {
    archiveConversation(id)
  }

  const handleUnarchive = (id: string) => {
    unarchiveConversation(id)
  }

  const handleStartEdit = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const handleFinishEdit = useCallback(() => {
    if (editingId && editTitle.trim()) {
      updateConversation(editingId, { title: editTitle.trim() })
    }
    setEditingId(null)
    setEditTitle('')
  }, [editingId, editTitle, updateConversation])

  const handleMindmapFinishEdit = useCallback(() => {
    if (mindmapEditingId && mindmapEditTitle.trim()) {
      updateMindmapTitle(mindmapEditingId, mindmapEditTitle.trim())
    }
    setMindmapEditingId(null)
    setMindmapEditTitle('')
  }, [mindmapEditingId, mindmapEditTitle, updateMindmapTitle])

  const handleNewMindmap = () => {
    if (newMindmapTitle.trim()) {
      addMindmap(newMindmapTitle.trim())
      setNewMindmapTitle('')
      setShowNewMindmap(false)
    }
  }

  const relativeTime = (ts: number) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    return `${days}天前`
  }

  const archivedExpanded = showArchived || !!search

  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-3 space-y-2">
        <Button className="w-full justify-start gap-2" variant="outline" onClick={onNewConversation}>
          <Plus className="w-4 h-4" />
          新建对话
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索对话..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8"
          />
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1 thin-scrollbar">
        <div className="p-2 space-y-0.5">
          {/* Active conversations */}
          <div className="px-1 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            对话
          </div>
          {activeConversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {search ? '未找到匹配的对话' : '暂无对话，点击上方新建'}
            </p>
          ) : (
            activeConversations.map(c => (
              <div
                key={c.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                  c.id === activeConversationId
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'hover:bg-sidebar-accent/50'
                }`}
                onClick={() => setActiveConversationId(c.id)}
              >
                {editingId === c.id ? (
                  <Input
                    className="h-7 text-sm"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={handleFinishEdit}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleFinishEdit()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate font-medium">{c.title}</div>
                    </div>
                    <div className="text-xs text-sidebar-foreground/60">{relativeTime(c.updatedAt)}</div>
                  </div>
                )}
                {editingId !== c.id && (
                  <div className="hidden group-hover:flex items-center gap-0.5 ml-2">
                    <button
                      className="p-1 rounded text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      onClick={e => { e.stopPropagation(); const md = exportConversationAsMarkdown(c); downloadMarkdown(md, c.title) }}
                      title="导出"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1 rounded text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      onClick={e => { e.stopPropagation(); handleStartEdit(c.id, c.title) }}
                      title="重命名"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1 rounded text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      onClick={e => { e.stopPropagation(); handleArchive(c.id) }}
                      title="归档"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Archived conversations */}
          {archivedConversations.length > 0 && (
            <>
              <div className="px-1 pt-2 mt-2 border-t border-sidebar-border">
                <button
                  className="flex items-center gap-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider w-full px-1 py-1 hover:text-sidebar-foreground transition-colors"
                  onClick={() => setShowArchived(!showArchived)}
                >
                  {archivedExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  已归档 ({archivedConversations.length})
                </button>
              </div>
              {archivedExpanded && archivedConversations.map(c => (
                <div
                  key={c.id}
                  className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-xs transition-colors opacity-60 ${
                    c.id === activeConversationId
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'hover:bg-sidebar-accent/50'
                  }`}
                  onClick={() => setActiveConversationId(c.id)}
                >
                  {editingId === c.id ? (
                    <Input
                      className="h-7 text-sm"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={handleFinishEdit}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleFinishEdit()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{c.title}</div>
                      <div className="text-[10px] text-sidebar-foreground/60">{relativeTime(c.updatedAt)}</div>
                    </div>
                  )}
                  {editingId !== c.id && (
                    <div className="hidden group-hover:flex items-center gap-0.5 ml-2">
                      <button
                        className="p-1 rounded text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                        onClick={e => { e.stopPropagation(); const md = exportConversationAsMarkdown(c); downloadMarkdown(md, c.title) }}
                        title="导出"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1 rounded text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                        onClick={e => { e.stopPropagation(); handleStartEdit(c.id, c.title) }}
                        title="重命名"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1 rounded text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                        onClick={e => { e.stopPropagation(); handleUnarchive(c.id) }}
                        title="取消归档"
                      >
                        <Undo2 className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1 rounded text-sidebar-foreground/60 hover:text-destructive hover:bg-sidebar-accent transition-colors"
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(c.id) }}
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {!search && (
            <>
              <div className="px-1 py-2 mt-2 pt-2 border-t border-sidebar-border">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    图谱
                  </span>
                  {showNewMindmap ? (
                    <div className="flex items-center gap-1">
                      <Input
                        className="h-6 text-xs w-24"
                        value={newMindmapTitle}
                        onChange={e => setNewMindmapTitle(e.target.value)}
                        onBlur={handleNewMindmap}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleNewMindmap()
                          if (e.key === 'Escape') { setShowNewMindmap(false); setNewMindmapTitle('') }
                        }}
                        placeholder="图谱名称..."
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      className="p-0.5 rounded text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                      onClick={() => setShowNewMindmap(true)}
                      title="新建图谱"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {mindmaps.length === 0 ? (
                <p className="text-xs text-sidebar-foreground/40 text-center py-3">
                  暂无图谱，点击 + 创建
                </p>
              ) : (
                mindmaps.map(m => (
                  <div
                    key={m.id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                      m.id === activeMindmapId
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'hover:bg-sidebar-accent/50'
                    }`}
                    onClick={() => setActiveMindmapId(m.id)}
                  >
                    {mindmapEditingId === m.id ? (
                      <Input
                        className="h-7 text-sm"
                        value={mindmapEditTitle}
                        onChange={e => setMindmapEditTitle(e.target.value)}
                        onBlur={handleMindmapFinishEdit}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleMindmapFinishEdit()
                          if (e.key === 'Escape') setMindmapEditingId(null)
                        }}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium flex items-center gap-1.5">
                          <Network className="w-3 h-3 shrink-0 text-sidebar-foreground/40" />
                          {m.title}
                        </div>
                        <div className="text-xs text-sidebar-foreground/60">{relativeTime(m.updatedAt)}</div>
                      </div>
                    )}
                    {mindmapEditingId !== m.id && (
                      <div className="hidden group-hover:flex items-center gap-0.5 ml-2">
                        <button
                          className="p-1 rounded text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                          onClick={e => { e.stopPropagation(); setMindmapEditingId(m.id); setMindmapEditTitle(m.title) }}
                          title="重命名"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1 rounded text-sidebar-foreground/60 hover:text-destructive hover:bg-sidebar-accent transition-colors"
                          onClick={e => { e.stopPropagation(); setMindmapDeleteId(m.id) }}
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </ScrollArea>

      <Separator />
      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm"
          onClick={onOpenSettings}
        >
          <Settings className="w-4 h-4" />
          提供商设置
        </Button>
      </div>

      <Dialog open={deleteConfirm !== null} onOpenChange={open => { if (!open) setDeleteConfirm(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">确定删除此对话？此操作不可恢复。</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mindmapDeleteId !== null} onOpenChange={open => { if (!open) setMindmapDeleteId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除图谱</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">确定删除此图谱？关联的对话不会被删除，但图谱内容不可恢复。</p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setMindmapDeleteId(null)}>取消</Button>
            <Button variant="destructive" onClick={() => { if (mindmapDeleteId) { removeMindmap(mindmapDeleteId); setMindmapDeleteId(null) } }}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ConversationSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { conversations, activeConversationId, updateConversation } = useConversationStore()
  const { providers } = useProviderStore()
  const active = conversations.find(c => c.id === activeConversationId)
  const [prompt, setPrompt] = useState(active?.systemPrompt ?? '')
  const provider = active ? providers.find(p => p.id === active.providerId) : null

  const handleSave = () => {
    if (active) {
      updateConversation(active.id, {
        systemPrompt: prompt,
      })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>会话设置</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {active && provider && (
            <div className="text-sm text-muted-foreground">
              当前模型: {provider.name} / {active.modelId}
            </div>
          )}
          <div>
            <label className="text-sm font-medium">系统提示词 (System Prompt)</label>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="你是一个 helpful assistant..."
              rows={6}
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
