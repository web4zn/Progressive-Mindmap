import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme, resolveInitialTheme, applyTheme } from '../useTheme'

const STORAGE_KEY = 'progressive-mindmap:theme'

function mockMatchMedia(prefersDark: boolean) {
  // happy-dom doesn't implement matchMedia natively. We stub a
  // minimal version that returns the configured value.
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({
      matches: query.includes('dark') ? prefersDark : !prefersDark,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    }),
  )
}

function clearStorage() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

describe('resolveInitialTheme (pure helper)', () => {
  it('returns the stored value when valid', () => {
    expect(resolveInitialTheme('light', false)).toBe('light')
    expect(resolveInitialTheme('dark', false)).toBe('dark')
  })

  it('ignores garbage in storage and falls back to systemDark', () => {
    expect(resolveInitialTheme('auto', true)).toBe('dark')
    expect(resolveInitialTheme('', false)).toBe('light')
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(null, false)).toBe('light')
  })
})

describe('applyTheme (DOM helper)', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset['theme']
  })

  it('applies the dark class + data-theme when given dark', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset['theme']).toBe('dark')
  })

  it('removes the dark class and sets data-theme=light when given light', () => {
    document.documentElement.classList.add('dark')
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.dataset['theme']).toBe('light')
  })
})

describe('useTheme', () => {
  beforeEach(() => {
    clearStorage()
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset['theme']
  })

  afterEach(() => {
    clearStorage()
    vi.unstubAllGlobals()
  })

  it('reads from localStorage when present (light)', () => {
    mockMatchMedia(false)
    window.localStorage.setItem(STORAGE_KEY, 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(result.current.setTheme).toBeTypeOf('function')
    expect(result.current.toggle).toBeTypeOf('function')
  })

  it('reads from localStorage when present (dark)', () => {
    mockMatchMedia(false)
    window.localStorage.setItem(STORAGE_KEY, 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('falls back to prefers-color-scheme when localStorage is empty', () => {
    mockMatchMedia(true) // system prefers dark
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('falls back to light when system is light and no localStorage', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('toggle flips light ↔ dark and persists', () => {
    mockMatchMedia(false)
    window.localStorage.setItem(STORAGE_KEY, 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    act(() => {
      result.current.toggle()
    })
    expect(result.current.theme).toBe('dark')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')
    act(() => {
      result.current.toggle()
    })
    expect(result.current.theme).toBe('light')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light')
  })

  it('setTheme writes through to localStorage and DOM', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    act(() => {
      result.current.setTheme('dark')
    })
    expect(result.current.theme).toBe('dark')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset['theme']).toBe('dark')
  })

  it('re-syncs the DOM after mount so external toggles do not drift', () => {
    // A pre-hydration script could write html.dark directly; the
    // hook will then re-apply on mount so subsequent `setTheme` /
    // `toggle` calls flow through `applyTheme`.
    mockMatchMedia(false)
    document.documentElement.classList.add('dark')
    document.documentElement.dataset['theme'] = 'dark'
    const { result } = renderHook(() => useTheme())
    // localStorage is empty AND system prefers light — initial
    // state is `light`. The mount effect then calls applyTheme
    // ('light'), which removes the dark class.
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
