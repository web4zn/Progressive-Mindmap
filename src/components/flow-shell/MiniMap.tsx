import { memo, useCallback, useState, type CSSProperties } from 'react'
import {
  MiniMap as XYFlowMiniMap,
  useReactFlow,
  type MiniMapProps,
  type Node,
  type Rect,
} from '@xyflow/react'

/**
 * Stage C — custom MiniMap wrapper.
 *
 * The xyflow MiniMap component renders a downscaled copy of the graph
 * but does NOT show a "this is your current viewport" rectangle. This
 * wrapper:
 *   1. Tracks the current viewport via `useReactFlow().getViewport()`
 *      and a ResizeObserver on the wrapper.
 *   2. Renders an SVG overlay on top of the MiniMap with a rectangle
 *      that mirrors the current viewport.
 *   3. Listens to clicks on the wrapper — clicking somewhere on the
 *      MiniMap moves the viewport so that point becomes the centre.
 *
 * The colour function + pannable / zoomable behaviour come from xyflow
 * unchanged. The viewport rectangle is a 2px stroke with a translucent
 * fill so the user can see what's "on screen" vs. the rest of the
 * graph at a glance.
 */
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
