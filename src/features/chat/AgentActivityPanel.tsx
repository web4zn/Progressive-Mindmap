import type { AgentStatus } from '@/lib/agent/types'

const STATUS_CONFIG: Record<
  AgentStatus,
  { icon: string; label: string; color: string }
> = {
  idle: { icon: '○', label: '等待中', color: 'text-muted-foreground' },
  thinking: { icon: '🤔', label: '分析对话...', color: 'text-blue-500' },
  reading_mindmap: {
    icon: '📖',
    label: '读取脑图结构...',
    color: 'text-blue-500',
  },
  reading_node: {
    icon: '🔍',
    label: '读取节点信息...',
    color: 'text-blue-500',
  },
  generating_mindmap: {
    icon: '🧠',
    label: '生成脑图...',
    color: 'text-purple-500',
  },
  complete: { icon: '✅', label: '脑图已更新', color: 'text-green-500' },
  error: { icon: '❌', label: '生成失败', color: 'text-red-500' },
}

const IN_FLIGHT_STATUSES: AgentStatus[] = [
  'thinking',
  'reading_mindmap',
  'reading_node',
  'generating_mindmap',
]

interface AgentActivityPanelProps {
  status: AgentStatus
  message: string | null
  /** Provided when the run can be cancelled (agent-runtime-hardening). */
  onCancel?: () => void
}

export function AgentActivityPanel({ status, message, onCancel }: AgentActivityPanelProps) {
  if (status === 'idle') return null

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle
  const canCancel = Boolean(onCancel) && IN_FLIGHT_STATUSES.includes(status)

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 text-xs border-t animate-in slide-in-from-bottom ${config.color}`}
    >
      <span className="animate-pulse">{config.icon}</span>
      <span>{config.label}</span>
      {message && message !== config.label && (
        <span className="text-muted-foreground truncate">— {message}</span>
      )}
      {canCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto shrink-0 rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
          title="取消 Agent 运行"
        >
          取消
        </button>
      )}
      {!canCancel && status === 'generating_mindmap' && (
        <span className="ml-auto">
          <span className="animate-ping">.</span>
        </span>
      )}
    </div>
  )
}
