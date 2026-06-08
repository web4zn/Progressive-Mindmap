/**
 * RectCardNode — the mindmap card. Single visual presentation
 * (12 px corner radius, 1 px border, 3 px left accent bar).
 *
 * Three-segment layout:
 *   header  — collapse button + icon + label + meta (from BaseNode)
 *   body    — sanitized HTML body, plain text summary, or nothing
 *   footer  — currently empty; reserved for child-count / source meta
 *
 * Earlier revisions had sibling shape components (RoundedChipNode /
 * IconCircleNode / StadiumNode) for a user-facing "switch shape"
 * menu. The v2 cleanup dropped the menu and the sibling components
 * because the non-rect variants hid body content and made the
 * canvas hard to read.
 */
import { type NodeProps } from '@xyflow/react'
import { BaseNode, fromNodeProps } from './BaseNode'
import { getNodeShape } from '@/lib/shapes/registry'

function RectCardNodeImpl(props: NodeProps) {
  const data = props.data as {
    label: string
    summary?: string
    content?: string
    contentType?: string
  }
  const shape = getNodeShape('rect')

  return (
    <BaseNode
      {...fromNodeProps(
        props,
        null,
        null,
        null,
        shape.defaultSize,
      )}
      data={data as never}
    />
  )
}

export default RectCardNodeImpl
