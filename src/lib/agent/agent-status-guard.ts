// ========================================
// Agent Status Guard — auto-idle 状态机兜底
// ========================================
//
// Phase 1 fix (Bug 3): the agent status state machine in
// `useMindmapAgent` had multiple paths into the `complete` / `error`
// states, and a few of them had no way back to `idle` (e.g. the
// `AGENT_ERROR` branch, the worker `onerror` / `onclose` handlers).
// Worse, the `AGENT_COMPLETE` branch relied on a single 3-second
// `setTimeout` reference that could be GC'd or pre-empted by a
// subsequent state change.
//
// The fix is to wrap the state transitions in a small guard that:
//   1. Schedules a 5-second safety-net timer after every `complete` /
//      `error` transition.
//   2. The timer checks that the *current* status is still the one we
//      were transitioning *away from* before flipping back to `idle` —
//      this prevents a stale timer from clobbering a newer state.
//   3. A new transition cancels the prior timer (the most recent
//      state wins).
//
// Keeping this logic in a tiny pure module makes it easy to unit-test
// the state machine with `vi.useFakeTimers()` and zero React plumbing.

import type { AgentStatus } from './types'

export type AgentStatusSetter = (status: AgentStatus, message?: string | null) => void
export type AgentStatusGetter = () => AgentStatus

/** Statuses that should eventually fall back to `idle`. Other statuses
 *  (`thinking`, `reading_mindmap`, `generating_mindmap`, `idle`) are
 *  intermediate / in-progress and never auto-revert. */
const TERMINAL_STATUSES: ReadonlySet<AgentStatus> = new Set(['complete', 'error'])

export interface AgentStatusGuard {
  /**
   * Record a state transition. If `status` is a terminal status
   * (`complete` / `error`), a fallback timer is scheduled to flip back
   * to `idle` after `delayMs` (default 5000). Any prior pending
   * fallback is cancelled. The caller is expected to have already set
   * the new status via the store setter — this helper only manages
   * the safety-net timer.
   */
  recordTransition: (status: AgentStatus, delayMs?: number) => void
  /**
   * Manually cancel any pending fallback. Used when the caller
   * transitions back to `idle` (or any other non-terminal state) on
   * its own — e.g. when the user stops generation.
   */
  clear: () => void
  /** Cancel any pending timer. Call from React `useEffect` cleanup. */
  dispose: () => void
}

export interface AgentStatusGuardOptions {
  /** Override the default status getter (defaults to reading from the
   *  Zustand `chatStore`). Useful in tests. */
  getStatus?: AgentStatusGetter
  /** Override the default fallback delay in ms (default 5000). Useful
   *  in tests so they don't have to wait. */
  defaultDelayMs?: number
}

/**
 * Build an `AgentStatusGuard` bound to a status setter. The guard is
 * stateful (it owns the safety-net timer) so always create one per
 * component instance — do not share across components.
 */
export function createAgentStatusGuard(
  setStatus: AgentStatusSetter,
  options: AgentStatusGuardOptions = {},
): AgentStatusGuard {
  const getStatus: AgentStatusGetter = options.getStatus ?? (() => 'idle')
  const defaultDelayMs = options.defaultDelayMs ?? 5000
  let timer: ReturnType<typeof setTimeout> | null = null
  let scheduledFrom: AgentStatus | null = null

  function clear(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    scheduledFrom = null
  }

  return {
    recordTransition(status, delayMs) {
      if (!TERMINAL_STATUSES.has(status)) {
        // Non-terminal states (thinking / reading_mindmap / etc.) — no
        // safety net. Just clear any prior pending fallback so it
        // doesn't fire later and clobber this in-progress state.
        clear()
        return
      }
      const delay = delayMs ?? defaultDelayMs
      if (timer !== null) {
        clearTimeout(timer)
      }
      scheduledFrom = status
      timer = setTimeout(() => {
        timer = null
        // Only revert if the status hasn't moved on. The whole point of
        // the guard is to be a safety net, not a state machine
        // override — if the caller already moved to a different state
        // (e.g. user pressed stop, or a new run started), respect it.
        if (scheduledFrom !== null && getStatus() === scheduledFrom) {
          setStatus('idle')
        }
        scheduledFrom = null
      }, delay)
    },
    clear,
    dispose: clear,
  }
}
