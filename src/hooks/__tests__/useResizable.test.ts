import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResizable } from '../useResizable'

describe('useResizable', () => {
  const defaultSize = { width: 480, height: 560 }
  const minSize = { width: 360, height: 400 }
  const maxSize = { width: 900, height: 800 }

  beforeEach(() => {
    // happy-dom doesn't implement clientX/Y on dispatched events by
    // default, so we patch a few fields used by the hook.
  })

  afterEach(() => {
    // Clean any leftover document body styles from a failed drag.
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  it('starts at defaultSize', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize }),
    )
    expect(result.current.size).toEqual(defaultSize)
  })

  it('grows when the user drags the handle down-right', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize }),
    )

    // Simulate mousedown on the handle.
    act(() => {
      result.current.startResize({
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: 0,
        clientY: 0,
      } as unknown as React.MouseEvent)
    })

    // Simulate mousemove 100px right + 50px down.
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 50 }))
    })

    expect(result.current.size).toEqual({ width: 580, height: 610 })

    // End the drag.
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
  })

  it('clamps to minSize when dragging up-left', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize }),
    )

    act(() => {
      result.current.startResize({
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: 0,
        clientY: 0,
      } as unknown as React.MouseEvent)
    })

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: -1000, clientY: -1000 }))
    })

    expect(result.current.size).toEqual(minSize)
  })

  it('clamps to maxSize when dragging too far', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize }),
    )

    act(() => {
      result.current.startResize({
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: 0,
        clientY: 0,
      } as unknown as React.MouseEvent)
    })

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10000, clientY: 10000 }))
    })

    expect(result.current.size).toEqual(maxSize)
  })

  it('reset() returns to defaultSize', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize }),
    )

    act(() => {
      result.current.startResize({
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: 0,
        clientY: 0,
      } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 200 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
    expect(result.current.size).not.toEqual(defaultSize)

    act(() => {
      result.current.reset()
    })
    expect(result.current.size).toEqual(defaultSize)
  })

  it('stops responding to mousemove after mouseup', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize }),
    )

    act(() => {
      result.current.startResize({
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: 0,
        clientY: 0,
      } as unknown as React.MouseEvent)
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    const afterUp = result.current.size

    // No drag is active, so further mousemove should NOT change size.
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 9999, clientY: 9999 }))
    })
    expect(result.current.size).toEqual(afterUp)
  })

  it('cleans up document body styles on mouseup', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize }),
    )

    act(() => {
      result.current.startResize({
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: 0,
        clientY: 0,
      } as unknown as React.MouseEvent)
    })
    expect(document.body.style.cursor).toBe('nwse-resize')
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
  })
})
