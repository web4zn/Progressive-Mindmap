import { memo, useMemo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { sanitizeHtml } from '@/lib/html-sanitizer'
import type { FlowNodeData } from './index'
import { selectNodeIcon, type NodeIconName } from '@/lib/node-icon'

/**
 * Phase 1 fix (Bug 2): the ⤢ glyph is a passive affordance that tells
 * the user "this node is interactive — double-click to expand, ⌘/Ctrl +
 * double-click to edit". It deliberately renders as a `<span>` (not a
 * `<button>`) so clicks pass through to the underlying node handler
 * instead of triggering a separate action. The native `title` provides
 * the OS-level tooltip; the CSS-only `.flow-node-affordance-tooltip`
 * below shows a richer bubble on hover within the canvas.
 */
function ExpandAffordance() {
  return (
    <span
      className="flow-node-affordance"
      role="presentation"
      aria-hidden
      title="双击展开 · Ctrl/⌘+双击编辑"
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {/* ⤢ — diagonal expand arrows (matches the spec's preferred glyph) */}
        <polyline points="15 3 21 3 21 9" />
        <polyline points="9 21 3 21 3 15" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
      </svg>
      <span className="flow-node-affordance-tooltip">双击展开 · Ctrl/⌘+双击编辑</span>
    </span>
  )
}

// Tiny inline icon components — avoids a hard lucide-react import in the
// data layer (which is unit-testable without React) and keeps the bundle
// leaner than dragging in the full lucide tree.
function PatternIcon({ name }: { name: NodeIconName }) {
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
          <path d="M9 14h6" />
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
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
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
 * The 800ms touch long-press fires from the *parent* node wrapper
 * (React Flow wires the gesture to a single DOM element). The hook
 * lives in `useLongPress.ts` and is re-exported here as a thin
 * convenience — keep Fast Refresh happy by NOT exporting new symbols
 * in the same file as a React component.
 */
function FlowNodeComponent({ id, data, selected }: NodeProps & { data: FlowNodeData }) {
  const hasHtml = data.contentType === 'html' && !!data.content
  const depth = data.depth ?? 0
  const depthClass = depth >= 4 ? 'depth-4' : `depth-${depth}`
  const isExpanded = data.expanded === true
  const iconName = useMemo(
    () => selectNodeIcon({ pattern: data.pattern, label: data.label }),
    [data.pattern, data.label],
  )

  const safeHtml = useMemo(
    () => (hasHtml ? { __html: sanitizeHtml(data.content!) } : undefined),
    [data.content, hasHtml],
  )

  const classes = [
    'flow-node',
    depthClass,
    selected ? 'selected' : '',
    isExpanded ? 'expanded' : '',
    data.editedByUser ? 'has-user-edit' : '',
    data.isDimmed ? 'dimmed' : '',
    data.isStreaming ? 'streaming' : '',
    data.isSearchMatch ? 'search-match' : '',
    data.collapsed ? 'collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} data-node-id={id} data-testid={`flow-node-${id}`}>
      <Handle type="target" position={Position.Left} className="flow-handle" />
      <Handle type="source" position={Position.Right} className="flow-handle" />

      <div className={`flow-node-accent ${depthClass}`} />

      <div className="flow-node-header">
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
          {/* Phase 1 fix (Bug 2): the ⤢ affordance always renders so the
              user can discover the double-click interaction. The icon is
              purely visual — it is a `<span>`, not a `<button>`, so the
              click passes through to the React Flow double-click handler.
              CSS hides it on hover for an unobtrusive feel. */}
          <ExpandAffordance />
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

      {hasHtml ? (
        <div className="flow-node-content nowheel" dangerouslySetInnerHTML={safeHtml} />
      ) : data.summary ? (
        <div className="flow-node-summary">{data.summary}</div>
      ) : null}

      {isExpanded && (
        <div className="flow-node-expand-hint nodrag" aria-hidden>
          再次双击收起 · Ctrl/⌘+双击打开编辑器
        </div>
      )}
    </div>
  )
}

export default memo(FlowNodeComponent)
