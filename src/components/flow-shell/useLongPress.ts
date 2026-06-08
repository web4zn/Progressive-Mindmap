import { useRef } from 'react'

/**
 * Stage C — touch long-press gesture.
 *
 * The 800ms long-press fires from the *parent* node wrapper
 * (React Flow wires the gesture to a single DOM element). The hook
 * is exported separately so it can be unit-tested in isolation
 * without mounting the full FlowNode.
 *
 * Spec: "onTouchStart 800ms 长按 → context menu, 移动时取消".
 * On `touchend` / `touchmove` (when the user has dragged more than
 * `moveThreshold` pixels) the timer is cleared so the context menu
 * never pops after a swipe.
 */
const LONG_PRESS_MS = 800
const MOVE_THRESHOLD_PX = 10

export function useLongPress(
  onLongPress: (event: React.TouchEvent) => void,
  options: { longPressMs?: number; moveThresholdPx?: number } = {},
) {
  const timerRef = useRef<number | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const longPressMs = options.longPressMs ?? LONG_PRESS_MS
  const moveThreshold = options.moveThresholdPx ?? MOVE_THRESHOLD_PX

  const cancel = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startPosRef.current = null
  }

  return {
    onTouchStart: (event: React.TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      startPosRef.current = { x: touch.clientX, y: touch.clientY }
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        startPosRef.current = null
        onLongPress(event)
      }, longPressMs)
    },
    onTouchMove: (event: React.TouchEvent) => {
      if (!startPosRef.current) return
      const touch = event.touches[0]
      if (!touch) {
        cancel()
        return
      }
      const dx = touch.clientX - startPosRef.current.x
      const dy = touch.clientY - startPosRef.current.y
      if (Math.sqrt(dx * dx + dy * dy) > moveThreshold) cancel()
    },
    onTouchEnd: cancel,
    onTouchCancel: cancel,
  }
}
