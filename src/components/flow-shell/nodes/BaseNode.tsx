/**
 * BaseNode — the card body every mindmap node renders inside.
 *
 * Owns:
 *  - The shared root classes (`.flow-node` + per-depth + per-state)
 *  - The two React Flow `<Handle>`s (left target, right source)
 *  - The user-edit dot + badge
 *  - The collapse / expand button
 *  - The HTML sanitisation pass for `contentType === 'html'`
 *
 * Earlier revisions also owned an "expand affordance" glyph and a
 * "再次双击收起" hint at the bottom of the node. Both were
 * decorative — the underlying state toggled a class that changed
 * almost nothing visually — so the v2 cleanup drops them. A plain
 * double-click on the node opens the editor (handled by the
 * parent), and the node itself shows its full body in one
 * presentation.
 *
 * Earlier revisions accepted a `shape` prop that picked between four
 * visual variants (rect / chip / circle / stadium); the v2 cleanup
 * removed the user-facing shape switcher because the non-rect
 * variants hid body content. The single presentation is the rect
 * card.
 */
import { memo, useMemo, type ReactNode } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { selectNodeIcon, type NodeIconName } from '@/lib/node-icon'
import type { FlowNodeData } from '../index'
import { getNodeShape } from '@/lib/shapes/registry'

/**
 * The props every node component must satisfy. The body composition
 * is supplied via `header` / `body` / `footer` children so the
 * presentation can be swapped without rewriting this file.
 */
export interface BaseNodeProps {
  id: string
  data: FlowNodeData
  selected: boolean
  header: ReactNode
  body: ReactNode
  footer?: ReactNode
  /**
   * The `defaultSize` from the shape registry. Used to set an
   * explicit `min-width` on the card so the dagre measurement
   * round-trip is stable when the label is very short.
   */
  defaultSize: { width: number; height: number }
}

/**
 * Reusable inline icon (matches v1's `PatternIcon`). Avoids a hard
 * lucide-react import in the data layer; re-exported here because
 * every node uses it.
 */
export function PatternIcon({ name }: { name: NodeIconName }) {
  if (!name) return null
  const common = {
    width: 12,
    height: 12,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'flow-node-icon',
  }
  switch (name) {
    case 'Zap':
      return (
        <svg {...common}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    case 'Scale':
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M5 7h14" />
          <path d="M5 7l-3 7a3 3 0 0 0 6 0L5 7z" />
          <path d="M19 7l-3 7a3 3 0 0 0 6 0L19 7z" />
        </svg>
      )
    case 'User':
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    case 'Lightbulb':
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M15.09 14a5 5 0 1 0-6.18 0" />
        </svg>
      )
    case 'Clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      )
    case 'MapPin':
      return (
        <svg {...common}>
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 10 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )
    case 'HelpCircle':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'CircleHelp':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'Circle':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
  }
}

/**
 * Compute the shared class string. Kept in this file because every
 * node funnels through `BaseNode` and we want a single set of
 * canonical hooks (`.flow-node`, `.depth-*`, `.selected`, …) for CSS.
 */
function buildNodeClasses(args: {
  depth: number
  selected: boolean
  data: FlowNodeData
}): string {
  const depthClass = args.depth >= 4 ? 'depth-4' : `depth-${args.depth}`
  return [
    'flow-node',
    depthClass,
    args.selected ? 'selected' : '',
    args.data.editedByUser ? 'has-user-edit' : '',
    args.data.isDimmed ? 'dimmed' : '',
    args.data.isStreaming ? 'streaming' : '',
    args.data.isSearchMatch ? 'search-match' : '',
    args.data.highlighted ? 'highlighted' : '',
    args.data.collapsed ? 'collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function BaseNodeInner({
  id,
  data,
  selected,
  header,
  body,
  footer,
  defaultSize,
}: BaseNodeProps) {
  const depth = data.depth ?? 0

  // Look up the icon deterministically from the registry. The icon
  // is purely a hint; the parent owns the actual <svg>.
  const iconName = useMemo(
    () => selectNodeIcon({ pattern: data.pattern, label: data.label }),
    [data.pattern, data.label],
  )

  // The shape registry now exposes a single entry — `rect` — but
  // the renderer still reads `defaultSize` from it so the dagre
  // round-trip stays stable. The `resolveShapeName` fallback inside
  // `getNodeShape` makes the lookup safe even if a legacy node
  // carries a `shape` field.
  const defaultShapeSize = getNodeShape(data.shape).defaultSize
  void defaultShapeSize

  const classes = buildNodeClasses({
    depth,
    selected,
    data,
  })

  return (
    <div
      className={classes}
      data-node-id={id}
      data-testid={`flow-node-${id}`}
      style={{
        minWidth: defaultSize.width,
      }}
    >
      <Handle type="target" position={Position.Left} className="flow-handle" />
      <Handle type="source" position={Position.Right} className="flow-handle" />

      <div className={`flow-node-accent ${depth >= 4 ? 'depth-4' : `depth-${depth}`}`} />

      <div className="flow-node-header">
        {header}

        {data.hasChildren ? (
          <button
            className="flow-node-collapse nodrag"
            onClick={(e) => {
              e.stopPropagation()
              data.onToggle?.(id)
            }}
            title={data.collapsed ? '展开' : '折叠'}
            aria-label={data.collapsed ? '展开' : '折叠'}
          >
            {data.collapsed ? '+' : '−'}
          </button>
        ) : (
          <span className="flow-node-collapse-spacer" aria-hidden />
        )}

        {iconName && <PatternIcon name={iconName} />}

        <span className="flow-node-label">{data.label}</span>

        <span className="flow-node-meta">
          {data.linkedConversationId && (
            <button
              className="flow-node-linked-conv nodrag"
              onClick={(e) => {
                e.stopPropagation()
                data.onNavigateToConversation?.(data.linkedConversationId!)
              }}
              title="跳转到关联对话"
              aria-label="跳转到关联对话"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          )}
          {data.editedByUser && (
            <span
              className="flow-node-edit-mark"
              title="用户编辑过"
              aria-label="用户编辑过"
            >
              <span className="flow-node-edit-dot" />
              {selected && <span className="flow-node-edit-badge">已编辑</span>}
            </span>
          )}
        </span>
      </div>

      {body ?? (
        <>
          {data.summary ? (
            <div className="flow-node-summary">{data.summary}</div>
          ) : null}
        </>
      )}

      {footer}
    </div>
  )
}

/**
 * Memoised so each node only re-renders when its own props
 * change. React Flow supplies the `selected` prop separately from
 * the data, so the standard `memo` works.
 */
export const BaseNode = memo(BaseNodeInner)

/**
 * Convenience helper: build a `BaseNodeProps` from the React Flow
 * `NodeProps` shape. The card body uses it to keep its signature
 * short.
 */
export function fromNodeProps(
  props: NodeProps,
  header: ReactNode,
  body: ReactNode,
  footer: ReactNode | undefined,
  defaultSize: { width: number; height: number },
): BaseNodeProps {
  return {
    id: props.id,
    data: props.data as unknown as FlowNodeData,
    selected: props.selected === true,
    header,
    body,
    footer,
    defaultSize,
  }
}
