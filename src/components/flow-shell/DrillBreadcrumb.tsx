/**
 * DrillBreadcrumb — breadcrumb navigation for mindmap drill-down mode.
 *
 * Renders a path like `🏠 全部 → 需求分析 → 用户故事` above the
 * canvas when the user has drilled into a subtree. Each segment
 * (except the current node) is clickable to navigate to that level.
 * Renders `null` when drillNodeId is null (not drilling).
 */
import { Home, ChevronRight } from 'lucide-react'
import type { MindMapNode } from '@/types/mindmap'
import { cn } from '@/lib/utils'

export interface DrillBreadcrumbProps {
  tree: MindMapNode[]
  drillNodeId: string
  onNavigate: (nodeId: string | null) => void
}

export default function DrillBreadcrumb({
  tree,
  drillNodeId,
  onNavigate,
}: DrillBreadcrumbProps) {
  // Build the ancestor chain using iterative DFS. Same algorithm as
  // findAncestorChain from mindmap-path.ts, but also carries labels.
  type Frame = { node: MindMapNode; trail: Array<{ id: string; label: string }> }
  const stack: Frame[] = tree.map((node) => ({
    node,
    trail: [{ id: node.id, label: node.label }],
  }))

  let chain: Array<{ id: string; label: string }> = []
  while (stack.length > 0) {
    const frame = stack.pop()
    if (!frame) break
    const { node, trail } = frame
    if (node.id === drillNodeId) {
      chain = trail
      break
    }
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i]
      if (!child) continue
      stack.push({
        node: child,
        trail: [...trail, { id: child.id, label: child.label }],
      })
    }
  }

  // If we couldn't find the node (shouldn't happen), silently render nothing.
  if (chain.length === 0) return null

  return (
    <nav
      data-testid="drill-breadcrumb"
      aria-label="下钻面包屑导航"
      className="absolute top-0 left-0 right-0 z-20 flex items-center gap-1 px-3 py-2 bg-background/90 backdrop-blur-sm border-b border-border text-sm"
    >
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        title="退出下钻，返回完整视图"
      >
        <Home className="w-3.5 h-3.5" />
        <span>全部</span>
      </button>

      {chain.map((segment, i) => {
        const isLast = i === chain.length - 1
        return (
          <span key={segment.id} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
            {isLast ? (
              <span
                className="px-1.5 py-0.5 rounded font-medium text-foreground"
                aria-current="page"
              >
                {segment.label || segment.id}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(segment.id)}
                className={cn(
                  'px-1.5 py-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors',
                )}
                title={`下钻到「${segment.label || segment.id}」`}
              >
                {segment.label || segment.id}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
