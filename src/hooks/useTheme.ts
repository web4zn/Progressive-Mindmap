import { useCallback, useEffect, useState } from 'react'

/**
 * Stage D — light / dark / system theme.
 *
 *  - Persists the user's explicit choice in `localStorage` under the
 *    key `progressive-mindmap:theme`. The key is namespaced so other
 *    Progressive-Mindmap settings (when they exist) won't clash.
 *  - Falls back to `prefers-color-scheme: dark` on first paint.
 *  - Applies the resolved theme by toggling both `html.dark` (for
 *    shadcn / Tailwind v4) and `html[data-theme]` (for
 *    FlowShell's CSS variable layer).
 *
 *  NOTE on storage: AGENTS.md says the *data* layer goes through
 *  IndexedDB. Theme is a UI preference, not a user artifact, and
 *  shadcn's own `next-themes` package (already in our `package.json`)
 *  uses `localStorage` for the same reason. We're following that
 *  precedent.
 */

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'progressive-mindmap:theme'

/**
 * Reads the current system preference. Exported so the theme script
 * that runs before React mounts (see `theme-init.ts`) can use the same
 * logic.
 */
export function prefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Pure helper: resolve a stored value (or absence) into a concrete
 * `ThemeMode`. Extracted so it can be unit-tested without a DOM.
 */
export function resolveInitialTheme(stored: string | null, systemDark: boolean): ThemeMode {
  if (stored === 'light' || stored === 'dark') return stored
  return systemDark ? 'dark' : 'light'
}

/**
 * Apply a theme to the document. Idempotent. Operates on
 * `document.documentElement` and the `<html>` dataset only — no
 * other DOM side effects.
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset['theme'] = theme
}

export interface UseThemeResult {
  theme: ThemeMode
  /** Force-set the theme (persists to localStorage). */
  setTheme: (next: ThemeMode) => void
  /** Flip light ↔ dark. */
  toggle: () => void
}

function readStoredTheme(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // localStorage can throw in privacy-mode Safari; treat as absent.
    return null
  }
}

function writeStoredTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore — the theme is still applied to the DOM this session
  }
}

/**
 * Read the *currently applied* theme from the DOM. Exported for the
 * benefit of a future pre-hydration script that needs to detect what
 * the user already has set (e.g. before this hook mounts, when
 * `useTheme` is not yet in scope).
 */
export function readAppliedTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme(): UseThemeResult {
  // Initial state comes from localStorage first, falling back to
  // the system preference. We intentionally do NOT read from
  // `document.documentElement.dataset.theme` here — that would
  // create a feedback loop with the apply-effect below and would
  // also clobber a localStorage value when the DOM doesn't have a
  // pre-hydration script. If a future stage wants to support a
  // pre-hydration script, the script can call `applyTheme()` (or
  // write to localStorage) before this hook mounts.
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    resolveInitialTheme(readStoredTheme(), prefersDark()),
  )

  // Re-apply the theme every render — cheap (two class / attribute
  // writes on `<html>`) and guarantees DOM ↔ state stay in lockstep
  // after a `setTheme` call.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: ThemeMode) => {
    writeStoredTheme(next)
    setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      writeStoredTheme(next)
      return next
    })
  }, [])

  return { theme, setTheme, toggle }
}
