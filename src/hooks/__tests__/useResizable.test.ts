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

describe('useResizable — direction: l (left-edge width-only handle)', () => {
  const defaultSize = { width: 420, height: 600 }
  const minSize = { width: 360, height: 400 }
  const maxSize = { width: 640, height: 800 }

  it('keeps default "br" behaviour when direction is omitted (backward compat)', () => {
    // Sanity: an existing call-site that doesn't pass `direction`
    // still grows height and width together, with the nwse
    // cursor — i.e. nothing about the historical `MindMapEditModal`
    // use-case broke when we added the `direction` prop.
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
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 50 }))
    })
    expect(result.current.size).toEqual({ width: 520, height: 650 })

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
  })

  it('grows width when the user drags the left handle to the left', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize, direction: 'l' }),
    )

    act(() => {
      result.current.startResize({
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: 0,
        clientY: 0,
      } as unknown as React.MouseEvent)
    })
    // Left handle: cursor should be ew-resize, not nwse-resize.
    expect(document.body.style.cursor).toBe('ew-resize')

    // Drag the mouse 80px to the LEFT (clientX = -80) — the
    // card should grow by 80px because the right edge is
    // anchored to the viewport.
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: -80, clientY: 9999 }))
    })

    expect(result.current.size.width).toBe(500)
    // Height must NOT change in `'l'` mode, regardless of dh.
    expect(result.current.size.height).toBe(defaultSize.height)

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
  })

  it('shrinks width when the user drags the left handle to the right', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize, direction: 'l' }),
    )

    act(() => {
      result.current.startResize({
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: 0,
        clientY: 0,
      } as unknown as React.MouseEvent)
    })

    // Drag 40px to the RIGHT — card shrinks by 40px.
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 40, clientY: 0 }))
    })
    expect(result.current.size.width).toBe(380)
    expect(result.current.size.height).toBe(defaultSize.height)

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
  })

  it('clamps to minSize.width when dragging far right (cannot shrink past min)', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize, direction: 'l' }),
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
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 9999, clientY: 0 }))
    })
    expect(result.current.size.width).toBe(minSize.width)

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
  })

  it('clamps to maxSize.width when dragging far left (cannot grow past max)', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize, direction: 'l' }),
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
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: -9999, clientY: 0 }))
    })
    expect(result.current.size.width).toBe(maxSize.width)

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
  })

  it('cleans up the ew-resize cursor on mouseup', () => {
    const { result } = renderHook(() =>
      useResizable({ defaultSize, minSize, maxSize, direction: 'l' }),
    )

    act(() => {
      result.current.startResize({
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: 0,
        clientY: 0,
      } as unknown as React.MouseEvent)
    })
    expect(document.body.style.cursor).toBe('ew-resize')
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })
    expect(document.body.style.cursor).toBe('')
  })
})
