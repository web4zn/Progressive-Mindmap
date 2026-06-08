import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMindmapHotkeys, type MindmapHotkeyHandlers } from '../useMindmapHotkeys'

function buildHandlers(over: Partial<MindmapHotkeyHandlers> = {}): {
  handlers: MindmapHotkeyHandlers
  spies: Record<keyof MindmapHotkeyHandlers, ReturnType<typeof vi.fn>>
} {
  const onFocusSelected = vi.fn()
  const onAutoArrange = vi.fn()
  const onZoomIn = vi.fn()
  const onZoomOut = vi.fn()
  const onDeleteSelected = vi.fn()
  const onAddChild = vi.fn()
  const onOpenContextMenu = vi.fn()
  const onArrowNavigate = vi.fn()
  const onTabJump = vi.fn()
  const onCancel = vi.fn()
  const onUndo = vi.fn()
  const onRedo = vi.fn()
  const handlers: MindmapHotkeyHandlers = {
    onFocusSelected,
    onAutoArrange,
    onZoomIn,
    onZoomOut,
    onDeleteSelected,
    onAddChild,
    onOpenContextMenu,
    onArrowNavigate,
    onTabJump,
    onCancel,
    onUndo,
    onRedo,
    ...over,
  }
  const spies: Record<keyof MindmapHotkeyHandlers, ReturnType<typeof vi.fn>> = {
    onFocusSelected,
    onAutoArrange,
    onZoomIn,
    onZoomOut,
    onDeleteSelected,
    onAddChild,
    onOpenContextMenu,
    onArrowNavigate,
    onTabJump,
    onCancel,
    onUndo,
    onRedo,
  }
  return { handlers, spies }
}

function dispatchKey(opts: {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  target?: EventTarget | null
}) {
  const event = new KeyboardEvent('keydown', {
    key: opts.key,
    ctrlKey: opts.ctrlKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    metaKey: opts.metaKey ?? false,
    bubbles: true,
    cancelable: true,
  })
  if (opts.target) {
    opts.target.dispatchEvent(event)
  } else {
    document.body.dispatchEvent(event)
  }
  return event
}

describe('useMindmapHotkeys', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('F fires onFocusSelected when a node is selected', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: 'n1' }))
    dispatchKey({ key: 'f' })
    expect(spies.onFocusSelected).toHaveBeenCalledWith('n1')
  })

  it('F is a no-op when no node is selected', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))
    dispatchKey({ key: 'f' })
    expect(spies.onFocusSelected).not.toHaveBeenCalled()
  })

  it('R fires onAutoArrange', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))
    dispatchKey({ key: 'r' })
    expect(spies.onAutoArrange).toHaveBeenCalledTimes(1)
  })

  it('+ and = fire onZoomIn', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))
    dispatchKey({ key: '+' })
    dispatchKey({ key: '=' })
    expect(spies.onZoomIn).toHaveBeenCalledTimes(2)
  })

  it('- and _ fire onZoomOut', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))
    dispatchKey({ key: '-' })
    dispatchKey({ key: '_' })
    expect(spies.onZoomOut).toHaveBeenCalledTimes(2)
  })

  it('Delete and Backspace fire onDeleteSelected when a node is selected', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: 'n1' }))
    dispatchKey({ key: 'Delete' })
    dispatchKey({ key: 'Backspace' })
    expect(spies.onDeleteSelected).toHaveBeenCalledTimes(2)
  })

  it('Delete is a no-op when no node is selected', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))
    dispatchKey({ key: 'Delete' })
    expect(spies.onDeleteSelected).not.toHaveBeenCalled()
  })

  it('Tab fires onTabJump without shift (not onAddChild)', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: 'n1' }))
    const ev = dispatchKey({ key: 'Tab' })
    expect(spies.onTabJump).toHaveBeenCalledWith('n1', false)
    expect(spies.onAddChild).not.toHaveBeenCalled()
    expect(ev.defaultPrevented).toBe(true)
  })

  it('Shift+Tab fires onTabJump with shift=true', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: 'n1' }))
    const ev = dispatchKey({ key: 'Tab', shiftKey: true })
    expect(spies.onTabJump).toHaveBeenCalledWith('n1', true)
    expect(ev.defaultPrevented).toBe(true)
  })

  it('Escape fires onCancel', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))
    dispatchKey({ key: 'Escape' })
    expect(spies.onCancel).toHaveBeenCalledTimes(1)
  })

  it('Cmd/Ctrl+Z fires onUndo', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))
    dispatchKey({ key: 'z', metaKey: true })
    dispatchKey({ key: 'z', ctrlKey: true })
    expect(spies.onUndo).toHaveBeenCalledTimes(2)
  })

  it('Cmd/Ctrl+Shift+Z fires onRedo (not onUndo)', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))
    dispatchKey({ key: 'Z', metaKey: true, shiftKey: true })
    dispatchKey({ key: 'z', ctrlKey: true, shiftKey: true })
    expect(spies.onRedo).toHaveBeenCalledTimes(2)
    expect(spies.onUndo).not.toHaveBeenCalled()
  })

  it('hotkeys are skipped when an input/textarea is focused', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: 'n1' }))

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    dispatchKey({ key: 'r', target: input })
    dispatchKey({ key: 'f', target: input })
    dispatchKey({ key: 'Tab', target: input })
    expect(spies.onAutoArrange).not.toHaveBeenCalled()
    expect(spies.onFocusSelected).not.toHaveBeenCalled()
    expect(spies.onTabJump).not.toHaveBeenCalled()
  })

  it('hotkeys are skipped when a contentEditable element is focused', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))

    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    editable.tabIndex = 0
    document.body.appendChild(editable)
    editable.focus()

    dispatchKey({ key: 'r', target: editable })
    expect(spies.onAutoArrange).not.toHaveBeenCalled()
  })

  it('detaches the listener on unmount', () => {
    const { handlers, spies } = buildHandlers()
    const { unmount } = renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))
    unmount()
    dispatchKey({ key: 'r' })
    expect(spies.onAutoArrange).not.toHaveBeenCalled()
  })

  // ── Stage C additions ──────────────────────────────────────────────

  it('Shift+F10 fires onOpenContextMenu when a node is selected', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: 'n1' }))
    const ev = dispatchKey({ key: 'F10', shiftKey: true })
    expect(spies.onOpenContextMenu).toHaveBeenCalledWith('n1')
    expect(ev.defaultPrevented).toBe(true)
  })

  it('Shift+F10 is a no-op when no node is selected', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))
    dispatchKey({ key: 'F10', shiftKey: true })
    expect(spies.onOpenContextMenu).not.toHaveBeenCalled()
  })

  it('ContextMenu key fires onOpenContextMenu when a node is selected', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: 'n1' }))
    dispatchKey({ key: 'ContextMenu' })
    expect(spies.onOpenContextMenu).toHaveBeenCalledWith('n1')
  })

  it('arrow keys fire onArrowNavigate with the correct direction', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: 'n1' }))
    dispatchKey({ key: 'ArrowUp' })
    dispatchKey({ key: 'ArrowDown' })
    dispatchKey({ key: 'ArrowLeft' })
    dispatchKey({ key: 'ArrowRight' })
    expect(spies.onArrowNavigate).toHaveBeenCalledTimes(4)
    expect(spies.onArrowNavigate).toHaveBeenNthCalledWith(1, 'n1', 'up')
    expect(spies.onArrowNavigate).toHaveBeenNthCalledWith(2, 'n1', 'down')
    expect(spies.onArrowNavigate).toHaveBeenNthCalledWith(3, 'n1', 'left')
    expect(spies.onArrowNavigate).toHaveBeenNthCalledWith(4, 'n1', 'right')
  })

  it('arrow keys are a no-op when no node is selected', () => {
    const { handlers, spies } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: null }))
    dispatchKey({ key: 'ArrowUp' })
    expect(spies.onArrowNavigate).not.toHaveBeenCalled()
  })

  it('arrow keys preventDefault to stop the browser from scrolling', () => {
    const { handlers } = buildHandlers()
    renderHook(() => useMindmapHotkeys({ handlers, selectedNodeId: 'n1' }))
    const ev = dispatchKey({ key: 'ArrowUp' })
    expect(ev.defaultPrevented).toBe(true)
  })
})
