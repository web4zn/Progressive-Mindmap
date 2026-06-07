import { useCallback, useMemo } from 'react'
import {
  CircleSlash,
  Download,
  FileImage,
  FileText,
  Maximize2,
  MessageSquare,
  Minimize2,
  Scale,
  UserCircle,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import MindMapCombobox from './MindMapCombobox'
import type { MindMap } from '@/types/mindmap'

/**
 * Stage B: three-section header. The previous header crammed 5 things
 * into one row; this one splits into a 3-column grid:
 *
 *   ┌────────────────────┬────────────────────┬────────────────────┐
 *   │ LEFT               │ MIDDLE             │ RIGHT              │
 *   │  • Combobox        │  • node count      │  • export menu     │
 *   │  • drawer toggle   │  • pattern select  │  • fullscreen      │
 *   │                    │  • status pill     │  • close panel     │
 *   └────────────────────┴────────────────────┴────────────────────┘
 *
 * The middle column centers its content; left and right align their
 * children to start / end respectively.
 */

const PATTERN_OPTIONS = [
  { value: 'auto', label: '自动', icon: Wand2, description: '由内容类型自动选择' },
  { value: '5w1h', label: '5W1H', icon: UserCircle, description: 'What / Why / Where / When / Who / How' },
  { value: 'tech', label: '技术概念', icon: Zap, description: '适合 API、库、架构等' },
  { value: 'pros-cons', label: '优缺点分析', icon: Scale, description: '利弊对比结构' },
] as const

const PATTERN_BY_VALUE: Record<string, (typeof PATTERN_OPTIONS)[number]> =
  Object.fromEntries(PATTERN_OPTIONS.map((p) => [p.value, p]))

export type MindMapPattern = (typeof PATTERN_OPTIONS)[number]['value']

export interface MindMapHeaderProps {
  mindmaps: MindMap[]
  activeMindmapId: string | null
  activeMindmap: MindMap | null
  nodeCount: number
  /** When the agent is mid-generation, set to true. */
  isAgentActive: boolean
  isFullscreen: boolean
  onSelectMindmap: (id: string) => void
  onRenameMindmap: (id: string, title: string) => void
  onChangePattern: (pattern: MindMapPattern) => void
  onOpenDrawer: () => void
  /** Number of linked conversations — rendered as a badge on the drawer button. */
  linkedCount: number
  onExportPng: (pixelRatio: 1 | 2 | 3) => void
  onExportSvg: () => void
  onExportMd: () => void
  onToggleFullscreen: () => void
  onClose: () => void
}

export default function MindMapHeader({
  mindmaps,
  activeMindmapId,
  activeMindmap,
  nodeCount,
  isAgentActive,
  isFullscreen,
  onSelectMindmap,
  onRenameMindmap,
  onChangePattern,
  onOpenDrawer,
  linkedCount,
  onExportPng,
  onExportSvg,
  onExportMd,
  onToggleFullscreen,
  onClose,
}: MindMapHeaderProps) {
  // The combobox is a top-level import; the only thing we wrap in
  // useMemo is the `mindmaps` ref, so a fresh array doesn't churn
  // the popover state.

  const currentPattern = useMemo<MindMapPattern>(() => {
    const raw = (activeMindmap?.pattern ?? 'auto') as string
    return (raw in PATTERN_BY_VALUE ? raw : 'auto') as MindMapPattern
  }, [activeMindmap?.pattern])

  const patternMeta = PATTERN_BY_VALUE[currentPattern] ?? PATTERN_OPTIONS[0]!

  const handleSelect = useCallback(
    (id: string) => onSelectMindmap(id),
    [onSelectMindmap],
  )
  const handleRename = useCallback(
    (id: string, title: string) => onRenameMindmap(id, title),
    [onRenameMindmap],
  )

  return (
    <header
      className={cn(
        'shrink-0 grid grid-cols-3 items-center gap-2 px-3 py-2',
        'border-b border-sidebar-border',
      )}
      data-testid="mindmap-header"
    >
      {/* LEFT — graph selector + drawer trigger */}
      <div className="flex items-center gap-1.5 justify-start min-w-0">
        <MindMapCombobox
          mindmaps={mindmaps}
          value={activeMindmapId}
          onSelect={handleSelect}
          onRename={handleRename}
          className="min-w-[140px] max-w-[260px]"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs shrink-0 relative"
          onClick={onOpenDrawer}
          aria-label={`打开关联会话（${linkedCount}）`}
          title="关联会话"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">关联会话</span>
          {linkedCount > 0 && (
            <span
              className="ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-medium bg-primary/15 text-primary"
              aria-label={`${linkedCount} 个关联会话`}
            >
              {linkedCount}
            </span>
          )}
        </Button>
      </div>

      {/* MIDDLE — node count + pattern + status pill */}
      <div className="flex items-center gap-2 justify-center min-w-0">
        {activeMindmap ? (
          <>
            <span
              className="inline-flex items-center h-7 px-2 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground"
              title="节点总数"
            >
              {nodeCount} 节点
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-input bg-background text-xs font-medium',
                  'hover:bg-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                )}
                aria-label="切换 pattern"
              >
                <patternMeta.icon className="w-3.5 h-3.5 text-primary" />
                <span>{patternMeta.label}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-52">
                <DropdownMenuLabel>选择 pattern</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PATTERN_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const isCurrent = opt.value === currentPattern
                  return (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => onChangePattern(opt.value)}
                      className={cn(isCurrent && 'bg-accent text-accent-foreground')}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm">{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {opt.description}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  )
                })}
                {activeMindmap.pattern && activeMindmap.pattern !== currentPattern && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onChangePattern('auto')}>
                      <CircleSlash className="w-4 h-4 mr-2" />
                      清除自定义 pattern
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[11px] font-medium',
                isAgentActive
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'
                  : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100',
              )}
              aria-live="polite"
              data-testid="agent-status-pill"
            >
              <span
                className={cn(
                  'inline-block w-1.5 h-1.5 rounded-full',
                  isAgentActive
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500',
                )}
              />
              {isAgentActive ? '生成中' : '空闲'}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">未选择图谱</span>
        )}
      </div>

      {/* RIGHT — export / fullscreen / close */}
      <div className="flex items-center gap-1 justify-end">
        {activeMindmap && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-input bg-background text-xs font-medium',
                'hover:bg-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              )}
              aria-label="导出"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>下载为</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExportPng(1)}>
                <FileImage className="w-4 h-4 mr-2" />PNG 1x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportPng(2)}>
                <FileImage className="w-4 h-4 mr-2" />PNG 2x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportPng(3)}>
                <FileImage className="w-4 h-4 mr-2" />PNG 3x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportSvg}>
                <FileImage className="w-4 h-4 mr-2" />SVG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportMd}>
                <FileText className="w-4 h-4 mr-2" />Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleFullscreen}
          title={isFullscreen ? '退出全屏' : '全屏'}
          aria-label={isFullscreen ? '退出全屏' : '全屏'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          title="关闭面板"
          aria-label="关闭面板"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
