/**
 * FlowMiniMap — mindmap-shell-v2 (task 5).
 *
 * Custom MiniMap wrapper. Inherited from Stage C:
 *  - tracks the current viewport via `useReactFlow().getViewport()`
 *  - renders a viewport rectangle overlay
 *  - click on the wrapper → re-centre the camera
 *  - the xyflow MiniMap provides node + edge painting
 *
 * mindmap-shell-v2 (task 5) addition: a second SVG layer that
 * prints the first non-whitespace character of each node's label
 * on top of the node marker. This makes the minimap scannable
 * even when zoomed all the way out — Dify calls this the "node
 * fingerprint". The character extraction is delegated to
 * `previewLabel` so the rule is unit-testable in isolation.
 */
import { memo, useCallback, useState, type CSSProperties } from 'react'
import {
  MiniMap as XYFlowMiniMap,
  useReactFlow,
  type MiniMapProps,
  type Node,
  type Rect,
} from '@xyflow/react'
import { previewLabel } from '@/lib/flow-minimap-label'

/**
 * mindmap-shell-v2 (task 5): per-node label size. At the
 * MiniMap's typical scale (240×160 px) a single character at 8 px
 * reads cleanly without crowding. Larger MiniMaps scale up
 * proportionally via the `--flow-minimap-font-scale` CSS var.
 */
const LABEL_BASE_PX = 8

export interface FlowMiniMapProps extends Pick<MiniMapProps, 'nodeColor' | 'nodeStrokeWidth'> {
  className?: string
  style?: CSSProperties
  /** Stroke colour for the viewport rectangle. Defaults to currentColor. */
  viewportStroke?: string
}

function computeNodeBounds(nodes: Node[]): Rect {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    const w = (n.measured?.width ?? n.width ?? 0) as number
    const h = (n.measured?.height ?? n.height ?? 0) as number
    const left = n.position.x
    const top = n.position.y
    const right = left + w
    const bottom = top + h
    if (left < minX) minX = left
    if (top < minY) minY = top
    if (right > maxX) maxX = right
    if (bottom > maxY) maxY = bottom
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function FlowMiniMapImpl({
  nodeColor,
  nodeStrokeWidth = 2,
  className,
  style,
  viewportStroke = 'var(--flow-pattern, currentColor)',
}: FlowMiniMapProps) {
  // Only the wrapper size lives in state — the viewport, bounds, and
  // node list are read fresh on every render from useReactFlow() so
  // we never need a `setState in effect`/`setState in render`.
  const [wrapperSize, setWrapperSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const { getViewport, getNodes, setViewport, flowToScreenPosition } = useReactFlow()
  const currentViewport = getViewport()
  const currentBounds = computeNodeBounds(getNodes())
  const currentNodes = getNodes()

  // ResizeObserver attached via ref callback (NOT a setState in effect).
  const wrapperRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const update = () => {
      const rect = node.getBoundingClientRect()
      setWrapperSize({ w: rect.width, h: rect.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
  }, [])

  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (wrapperSize.w === 0 || wrapperSize.h === 0) return
    const el = event.currentTarget
    const rect = el.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top
    if (currentBounds.width === 0 || currentBounds.height === 0) return
    // Map MiniMap screen offset → flow coordinates. The MiniMap fills
    // the wrapper with the graph spread across `bounds` of flow space.
    const flowX = currentBounds.x + (offsetX / wrapperSize.w) * currentBounds.width
    const flowY = currentBounds.y + (offsetY / wrapperSize.h) * currentBounds.height
    const currentScreen = flowToScreenPosition({ x: flowX, y: flowY })
    const dx = event.clientX - currentScreen.x
    const dy = event.clientY - currentScreen.y
    setViewport(
      {
        x: currentViewport.x - dx / currentViewport.zoom,
        y: currentViewport.y - dy / currentViewport.zoom,
        zoom: currentViewport.zoom,
      },
      { duration: 200 },
    )
  }

  // Viewport rectangle in MiniMap screen space. Derived purely from
  // the current viewport + bounds + wrapper size — no setState involved.
  let rectX = 0
  let rectY = 0
  let rectW = 0
  let rectH = 0
  if (
    wrapperSize.w > 0 &&
    wrapperSize.h > 0 &&
    currentBounds.width > 0 &&
    currentBounds.height > 0 &&
    currentViewport.zoom > 0
  ) {
    const flowVisibleW = wrapperSize.w / currentViewport.zoom
    const flowVisibleH = wrapperSize.h / currentViewport.zoom
    const flowOriginX = -currentViewport.x / currentViewport.zoom
    const flowOriginY = -currentViewport.y / currentViewport.zoom
    rectX = ((flowOriginX - currentBounds.x) / currentBounds.width) * wrapperSize.w
    rectY = ((flowOriginY - currentBounds.y) / currentBounds.height) * wrapperSize.h
    rectW = (flowVisibleW / currentBounds.width) * wrapperSize.w
    rectH = (flowVisibleH / currentBounds.height) * wrapperSize.h
  }

  // mindmap-shell-v2 (task 5): pre-compute per-node label positions
  // and visibility. We hide the label when the node is smaller than
  // ~14 px on the minimap so we don't pile glyphs on top of each
  // other in dense maps.
  type LabelEntry = { x: number; y: number; text: string }
  const labelEntries: LabelEntry[] = []
  if (wrapperSize.w > 0 && currentBounds.width > 0) {
    const sx = wrapperSize.w / currentBounds.width
    const sy = wrapperSize.h / currentBounds.height
    for (const n of currentNodes) {
      const w = (n.measured?.width ?? n.width ?? 0) as number
      const h = (n.measured?.height ?? n.height ?? 0) as number
      if (w * sx < 14 || h * sy < 14) continue
      const char = previewLabel(n)
      if (!char) continue
      const cx =
        ((n.position.x + w / 2 - currentBounds.x) / currentBounds.width) * wrapperSize.w
      const cy =
        ((n.position.y + h / 2 - currentBounds.y) / currentBounds.height) * wrapperSize.h
      labelEntries.push({ x: cx, y: cy, text: char })
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={`flow-minimap-wrap ${className ?? ''}`}
      style={{
        position: 'relative',
        cursor: 'crosshair',
        ...style,
      }}
      onClick={onClick}
      data-testid="flow-minimap"
    >
      <XYFlowMiniMap
        nodeColor={nodeColor}
        nodeStrokeWidth={nodeStrokeWidth}
        pannable
        zoomable
        className="flow-minimap"
      />
      {/* mindmap-shell-v2 (task 5): per-node first-character preview. */}
      {labelEntries.length > 0 && (
        <svg
          aria-hidden
          width={wrapperSize.w}
          height={wrapperSize.h}
          className="flow-minimap-labels"
          data-testid="flow-minimap-labels"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            fontSize: `${LABEL_BASE_PX}px`,
            fontWeight: 600,
            fontFamily: 'inherit',
            fill: 'var(--flow-text, currentColor)',
            opacity: 0.85,
          }}
        >
          {labelEntries.map((entry, idx) => (
            <text
              key={`minimap-label-${idx}-${entry.text}`}
              x={entry.x}
              y={entry.y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                paintOrder: 'stroke',
                stroke: 'var(--flow-card-bg, white)',
                strokeWidth: 2,
                strokeLinejoin: 'round',
              }}
            >
              {entry.text}
            </text>
          ))}
        </svg>
      )}
      {wrapperSize.w > 0 && rectW > 0 && rectH > 0 && (
        <svg
          aria-hidden
          width={wrapperSize.w}
          height={wrapperSize.h}
          className="flow-minimap-viewport"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <rect
            x={Math.max(0, rectX)}
            y={Math.max(0, rectY)}
            width={Math.min(wrapperSize.w, rectW)}
            height={Math.min(wrapperSize.h, rectH)}
            fill="currentColor"
            fillOpacity={0.08}
            stroke={viewportStroke}
            strokeWidth={1.5}
            rx={3}
            ry={3}
          />
        </svg>
      )}
    </div>
  )
}

export default memo(FlowMiniMapImpl)
