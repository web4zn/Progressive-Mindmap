import { useCallback, useEffect, useRef, useState } from 'react'

export interface Size {
  width: number
  height: number
}

/**
 * Where the resize handle sits on the host element and which
 * axes the drag adjusts. `'br'` is the historical "bottom-right
 * corner" behaviour (used by the now-removed `MindMapEditModal`).
 * `'l'` is a left-edge handle that adjusts width only — useful
 * for in-canvas cards anchored to the right side of the canvas
 * (e.g. `NodeEditorCard`) where the user wants a wider editing
 * surface without re-flowing the height, and where a right-edge
 * handle would fall off the viewport.
 */
export type ResizeDirection = 'br' | 'l'

export interface UseResizableOptions {
  /** Initial size in CSS pixels. */
  defaultSize: Size
  /** Hard lower bound. The handle clamps to this; the user can't shrink past it. */
  minSize: Size
  /** Hard upper bound. The handle clamps to this; the user can't grow past it. */
  maxSize: Size
  /**
   * Which axes the drag adjusts and which cursor to show.
   * Defaults to `'br'` for backward compatibility — every
   * existing call-site wants the original bottom-right corner
   * behaviour.
   */
  direction?: ResizeDirection
}

export interface UseResizableReturn {
  size: Size
  /** Pass to a `<div ref={...}>` that will be observed for resize */
  resizeHandleRef: React.RefObject<HTMLDivElement>
  /** Stable callback wired to the handle's `onMouseDown`. */
  startResize: (event: React.MouseEvent) => void
  /** Reset to `defaultSize`. Used when the user re-opens the modal. */
  reset: () => void
}

/**
 * Tiny imperative-resize hook. Originally extracted for the
 * `MindMapEditModal` dialog (now removed — replaced by
 * `NodeEditorCard`). Re-introduced in `NodeEditorCard` to give
 * the in-canvas editor a left-edge width-only resize handle.
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
  direction = 'br',
}: UseResizableOptions): UseResizableReturn {
  const [size, setSize] = useState<Size>(defaultSize)
  const startRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)

  // The latest min/max in a ref so the mousemove handler can read
  // them without re-binding (the handler is attached to `window`).
  const boundsRef = useRef({ minSize, maxSize })
  useEffect(() => {
    boundsRef.current = { minSize, maxSize }
  }, [minSize, maxSize])

  // Direction is also read inside the window-level mousemove handler
  // — pinning it in a ref avoids re-binding the listener when the
  // caller toggles the prop. In practice direction is stable for the
  // lifetime of a host, but the ref keeps the code honest.
  const dirRef = useRef<ResizeDirection>(direction)
  useEffect(() => {
    dirRef.current = direction
  }, [direction])

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      // Always prevent text selection while dragging, regardless of
      // direction. The cursor switch below makes the affordance
      // direction-specific.
      event.preventDefault()
      event.stopPropagation()
      startRef.current = { x: event.clientX, y: event.clientY, w: size.width, h: size.height }
      // Capture the cursor and mark the document so the user gets
      // a continuous resize-cursor while moving the mouse anywhere
      // over the window.
      document.body.style.cursor = direction === 'l' ? 'ew-resize' : 'nwse-resize'
      document.body.style.userSelect = 'none'
    },
    [size, direction],
  )

  useEffect(() => {
    function onMove(event: MouseEvent) {
      const start = startRef.current
      if (!start) return
      const { minSize: min, maxSize: max } = boundsRef.current
      const dw = event.clientX - start.x
      if (dirRef.current === 'l') {
        // Left-edge handle: dragging left grows the host (the
        // right edge is anchored), dragging right shrinks it.
        // Height is intentionally untouched.
        const nextW = clamp(start.w - dw, min.width, max.width)
        setSize({ width: nextW, height: start.h })
      } else {
        const dh = event.clientY - start.y
        const nextW = clamp(start.w + dw, min.width, max.width)
        const nextH = clamp(start.h + dh, min.height, max.height)
        setSize({ width: nextW, height: nextH })
      }
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
