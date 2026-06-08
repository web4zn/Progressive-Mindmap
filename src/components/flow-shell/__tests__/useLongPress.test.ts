import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLongPress } from '../useLongPress'

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function fakeTouch(clientX: number, clientY: number): React.TouchEvent {
    return {
      touches: [{ clientX, clientY } as React.Touch],
      // The rest of the event API is unused by the hook.
    } as unknown as React.TouchEvent
  }

  it('fires the long-press callback after 800ms by default', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))
    act(() => {
      result.current.onTouchStart(fakeTouch(10, 10))
    })
    expect(onLongPress).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(799)
    })
    expect(onLongPress).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('respects a custom longPressMs option', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress, { longPressMs: 500 }))
    act(() => {
      result.current.onTouchStart(fakeTouch(10, 10))
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('cancels when the user moves more than 10px', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))
    act(() => {
      result.current.onTouchStart(fakeTouch(0, 0))
    })
    act(() => {
      result.current.onTouchMove(fakeTouch(20, 0))
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does NOT cancel for a small move (< 10px)', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))
    act(() => {
      result.current.onTouchStart(fakeTouch(0, 0))
    })
    act(() => {
      result.current.onTouchMove(fakeTouch(5, 0))
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('cancels on touchend', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))
    act(() => {
      result.current.onTouchStart(fakeTouch(0, 0))
    })
    act(() => {
      result.current.onTouchEnd()
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('cancels on touchcancel', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))
    act(() => {
      result.current.onTouchStart(fakeTouch(0, 0))
    })
    act(() => {
      result.current.onTouchCancel()
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('starting a new touch cancels the previous timer', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() => useLongPress(onLongPress))
    act(() => {
      result.current.onTouchStart(fakeTouch(0, 0))
    })
    act(() => {
      vi.advanceTimersByTime(400)
    })
    act(() => {
      result.current.onTouchStart(fakeTouch(0, 0)) // restart
    })
    act(() => {
      vi.advanceTimersByTime(400) // 800ms total, but only 400 from the restart
    })
    expect(onLongPress).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })
})
