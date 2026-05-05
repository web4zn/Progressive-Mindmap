import { memo, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { MindMapNodeData } from './types'

function MindMapNodeComponent({ id, data, selected }: NodeProps & { data: MindMapNodeData }) {
  const isMarkdown = data.contentType === 'markdown' && data.content
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el || !isMarkdown) return

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const atTop = scrollTop <= 0
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1

      if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
        e.stopPropagation()
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [isMarkdown])

  return (
    <div
      className={`mindmap-node group relative rounded-lg border bg-card px-3 py-2 shadow-sm transition-colors min-w-[180px] max-w-[320px]
        ${isMarkdown ? 'min-h-[80px]' : ''}
        ${selected ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />

      <div className="flex items-center gap-1.5">
        {data.hasChildren && (
          <button
            className="nodrag shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              const handler = (window as unknown as { __mindmapToggle?: (id: string) => void })
                .__mindmapToggle
              handler?.(id)
            }}
          >
            {data.collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        {!data.hasChildren && <span className="w-3.5 shrink-0" />}

        <span className="text-sm font-medium leading-snug truncate">{data.label}</span>

        <span className="shrink-0 flex items-center gap-1 ml-auto">
          {data.editedByUser && (
            <span className="text-[10px] text-primary/60" title="手动编辑">
              <Pencil className="w-3 h-3" />
            </span>
          )}
          {data.sourceCount > 0 && (
            <span className="text-[10px] text-muted-foreground/60">💬{data.sourceCount}</span>
          )}
        </span>
      </div>

      {isMarkdown ? (
        <div
          ref={contentRef}
          className="mt-1.5 text-xs leading-relaxed max-h-[180px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none prose-code:text-[11px] prose-pre:bg-muted prose-pre:text-[11px] prose-table:text-[11px] prose-th:px-2 prose-td:px-2"
        >
          <Markdown remarkPlugins={[remarkGfm]}>{data.content!}</Markdown>
        </div>
      ) : data.summary ? (
        <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
          {data.summary}
        </div>
      ) : null}
    </div>
  )
}

export default memo(MindMapNodeComponent)
