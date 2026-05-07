import { useState, useCallback } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileImage,
  FileText,
  Link2,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { useMindmapStore } from '@/stores/mindmapStore'
import { useConversationStore } from '@/stores/conversationStore'
import { exportMindmapAsMarkdown, downloadMarkdown } from '@/lib/export'
import { exportMindmapAsPng, exportMindmapAsSvg } from '@/lib/export-mindmap'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import MindMapTree from '@/features/mindmap/MindMapTree'

interface MindMapPanelProps {
  onClose: () => void
}

export default function MindMapPanel({ onClose }: MindMapPanelProps) {
  const { mindmaps, activeMindmapId, setActiveMindmapId } = useMindmapStore()
  const { conversations } = useConversationStore()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [linkedOpen, setLinkedOpen] = useState(true)

  const activeMindmap = mindmaps.find((m) => m.id === activeMindmapId) ?? null

  const linkedConversations = conversations.filter((c) =>
    activeMindmap?.monitoredConversationIds?.includes(c.id),
  )

  const activeConvId = useConversationStore((s) => s.activeConversationId)

  const isCurrentLinked =
    activeMindmapId != null && activeConvId != null
      ? (activeMindmap?.monitoredConversationIds ?? []).includes(activeConvId)
      : false

  const handleLinkCurrent = useCallback(() => {
    if (activeConvId && activeMindmapId) {
      useMindmapStore.getState().addMonitoredConversation(activeMindmapId, activeConvId)
    }
  }, [activeConvId, activeMindmapId])

  const handleUnlink = useCallback(
    (convId: string) => {
      if (activeMindmapId) {
        useMindmapStore.getState().removeMonitoredConversation(activeMindmapId, convId)
      }
    },
    [activeMindmapId],
  )

  const handleExportPng = (pixelRatio: 1 | 2 | 3) => {
    if (!activeMindmap) return
    exportMindmapAsPng({ pixelRatio, filename: activeMindmap.title })
  }

  const handleExportSvg = () => {
    if (!activeMindmap) return
    exportMindmapAsSvg(activeMindmap.title)
  }

  const handleExportMd = () => {
    if (!activeMindmap) return
    const md = exportMindmapAsMarkdown(activeMindmap)
    downloadMarkdown(md, activeMindmap.title)
  }

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
              {activeMindmap?.title ?? '选择图谱...'}
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
            <span className="text-xs text-sidebar-foreground/50 shrink-0">
              {countNodes(activeMindmap.tree)} 节点
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors shrink-0 whitespace-nowrap cursor-pointer ml-auto">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">导出</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => handleExportPng(1)}>
                  <FileImage className="w-4 h-4 mr-2" />PNG 1x
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPng(2)}>
                  <FileImage className="w-4 h-4 mr-2" />PNG 2x
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPng(3)}>
                  <FileImage className="w-4 h-4 mr-2" />PNG 3x
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSvg}>
                  <FileImage className="w-4 h-4 mr-2" />SVG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportMd}>
                  <FileText className="w-4 h-4 mr-2" />Markdown
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {activeMindmap && (
        <div className="border-t border-sidebar-border pt-2 px-3">
          <button
            className="flex items-center gap-1 text-xs font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground w-full"
            onClick={() => setLinkedOpen((o) => !o)}
          >
            {linkedOpen ? (
              <ChevronDown className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 shrink-0" />
            )}
            关联会话 ({linkedConversations.length})
            {activeConvId && (
              <button
                className="ml-auto inline-flex items-center gap-1 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  if (isCurrentLinked) {
                    handleUnlink(activeConvId)
                  } else {
                    handleLinkCurrent()
                  }
                }}
                title={isCurrentLinked ? '取消关联当前会话' : '关联当前会话'}
              >
                <Link2 className="w-3 h-3" />
                {isCurrentLinked ? '已关联' : '关联当前'}
              </button>
            )}
          </button>
          {linkedOpen && (
            <div className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
              {linkedConversations.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  未关联任何会话，打开一个会话后在右侧面板点击「关联当前」
                </p>
              ) : (
                linkedConversations.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-sidebar-accent/30 group/item text-xs"
                  >
                    <span
                      className={`truncate flex-1 ${c.archived ? 'text-muted-foreground/50 italic' : ''}`}
                    >
                      {c.title}
                      {c.id === activeConvId && (
                        <span className="text-sidebar-foreground/40 ml-1">(当前)</span>
                      )}
                    </span>
                    <button
                      className="opacity-0 group-hover/item:opacity-100 transition-opacity text-sidebar-foreground/40 hover:text-red-400 px-0.5"
                      onClick={() => handleUnlink(c.id)}
                      title="取消关联"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <MindMapTree
        tree={activeMindmap?.tree ?? []}
        mindmapId={activeMindmapId ?? undefined}
        isGenerating={false}
        isStreaming={false}
        error={null}
      />
    </div>
  )
}

function countNodes(nodes: import('@/types/mindmap').MindMapNode[]): number {
  let count = nodes.length
  for (const node of nodes) {
    count += countNodes(node.children)
  }
  return count
}
