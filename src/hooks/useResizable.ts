import { useCallback, useEffect, useRef, useState } from 'react'

export interface Size {
  width: number
  height: number
}

export interface UseResizableOptions {
  /** Initial size in CSS pixels. */
  defaultSize: Size
  /** Hard lower bound. The handle clamps to this; the user can't shrink past it. */
  minSize: Size
  /** Hard upper bound. The handle clamps to this; the user can't grow past it. */
  maxSize: Size
}

export interface UseResizableReturn {
  size: Size
  /** Pass to a `<div ref={...}>` that will be observed for resize */
  resizeHandleRef: React.RefObject<HTMLDivElement | null>
  /** Stable callback wired to the handle's `onMouseDown`. */
  startResize: (event: React.MouseEvent) => void
  /** Reset to `defaultSize`. Used when the user re-opens the modal. */
  reset: () => void
}

/**
 * Tiny imperative-resize hook. Originally extracted for the
 * `MindMapEditModal` dialog (now removed — replaced by
 * `NodeEditorCard` which does not expose a resize handle). Kept
 * as a public hook so any future floating panel that *does* want
 * a drag-resize handle can reuse it without re-deriving the math.
 *
 * We don't pull in `react-resizable-panels` (or `react-resizable`)
 * for this — the typical use-site has exactly one drag handle,
 * the math is ~30 lines, and a dep would add 30kb+ to the bundle
 * for a single use-site.
 *
 * The hook clamps to [minSize, maxSize] on every mousemove so the
 * user can never drag the host off-screen.
 */
export function useResizable({
  defaultSize,
  minSize,
  maxSize,
}: UseResizableOptions): UseResizableReturn {
  const [size, setSize] = useState<Size>(defaultSize)
  const startRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const resizeHandleRef = useRef<HTMLDivElement | null>(null)

  // The latest min/max in a ref so the mousemove handler can read
  // them without re-binding (the handler is attached to `window`).
  const boundsRef = useRef({ minSize, maxSize })
  useEffect(() => {
    boundsRef.current = { minSize, maxSize }
  }, [minSize, maxSize])

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      // The handle is bottom-right, so movement should always be
      // positive. Prevent text selection while dragging.
      event.preventDefault()
      event.stopPropagation()
      startRef.current = { x: event.clientX, y: event.clientY, w: size.width, h: size.height }
      // Capture the cursor and mark the document so the user gets
      // a continuous resize-cursor while moving the mouse anywhere
      // over the window.
      document.body.style.cursor = 'nwse-resize'
      document.body.style.userSelect = 'none'
    },
    [size],
  )

  useEffect(() => {
    function onMove(event: MouseEvent) {
      const start = startRef.current
      if (!start) return
      const { minSize: min, maxSize: max } = boundsRef.current
      const dw = event.clientX - start.x
      const dh = event.clientY - start.y
      const nextW = clamp(start.w + dw, min.width, max.width)
      const nextH = clamp(start.h + dh, min.height, max.height)
      setSize({ width: nextW, height: nextH })
    }
    function onUp() {
      if (!startRef.current) return
      startRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const reset = useCallback(() => {
    setSize(defaultSize)
  }, [defaultSize])

  return { size, resizeHandleRef, startResize, reset }
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo
  return Math.min(Math.max(n, lo), hi)
}
