import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { FlowNodeData } from './index'

function FlowNodeComponent({ id, data, selected }: NodeProps & { data: FlowNodeData }) {
  const hasMarkdown = data.contentType === 'markdown' && data.content
  const depth = data.depth ?? 0
  const depthClass = depth >= 4 ? 'depth-4' : `depth-${depth}`

  return (
    <div className={`flow-node${selected ? ' selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="flow-handle" />
      <Handle type="source" position={Position.Right} className="flow-handle" />

      <div className={`flow-node-accent ${depthClass}`} />

      <div className="flow-node-header">
        {data.hasChildren && (
          <button
            className="flow-node-collapse nodrag"
            onClick={(e) => {
              e.stopPropagation()
              data.onToggle?.(id)
            }}
            title={data.collapsed ? '展开' : '折叠'}
          >
            {data.collapsed ? '+' : '−'}
          </button>
        )}
        {!data.hasChildren && <span style={{ width: '1.25rem', flexShrink: 0 }} />}

        <span className="flow-node-label">{data.label}</span>

        <span className="flow-node-meta">
          {data.editedByUser && (
            <svg
              className="flow-node-edit-mark"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          )}
        </span>
      </div>

      {hasMarkdown ? (
        <div className="flow-node-content">
          <Markdown remarkPlugins={[remarkGfm]}>{data.content!}</Markdown>
        </div>
      ) : data.summary ? (
        <div className="flow-node-summary">{data.summary}</div>
      ) : null}
    </div>
  )
}

export default memo(FlowNodeComponent)
