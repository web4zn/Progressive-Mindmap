import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAgentStatusGuard, type AgentStatusSetter } from '@/lib/agent/agent-status-guard'
import type { AgentStatus } from '@/lib/agent/types'

/**
 * Phase 1 fix (Bug 3): the auto-idle safety net in
 * `useMindmapAgent` is now backed by a small `AgentStatusGuard`
 * module. These tests pin down the state machine so the bug doesn't
 * regress:
 *
 *   - Complete path auto-falls back to idle after 5 s
 *   - Error path also auto-falls back to idle (was the original bug)
 *   - A new status cancels the prior timer (no stacking)
 *   - The fallback is defensive: it only fires if the status is
 *     still the one we were trying to leave (newer states win)
 *   - dispose() cancels any pending timer
 *
 * Pure module → no React, no Web Worker, no stores required.
 */

describe('createAgentStatusGuard (Phase 1 Bug 3 — agentStatus fallback)', () => {
  let setStatus: AgentStatusSetter
  let currentStatus: AgentStatus
  let setStatusSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    currentStatus = 'idle'
    setStatusSpy = vi.fn((s: AgentStatus) => {
      currentStatus = s
    })
    setStatus = setStatusSpy as AgentStatusSetter
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('after a "complete" transition, the status flips back to idle after 5 s', () => {
    const guard = createAgentStatusGuard(setStatus, {
      getStatus: () => currentStatus,
    })

    currentStatus = 'complete'
    guard.recordTransition('complete')

    // At t=0 the setter has not been called by the guard — the caller
    // is expected to set the status itself and only delegate the
    // safety-net timer to the guard.
    expect(setStatusSpy).not.toHaveBeenCalled()
    expect(currentStatus).toBe('complete')

    // 1 ms before the deadline, still 'complete'.
    vi.advanceTimersByTime(4999)
    expect(currentStatus).toBe('complete')
    expect(setStatusSpy).not.toHaveBeenCalled()

    // 1 ms past the deadline — the guard flips it to 'idle'.
    vi.advanceTimersByTime(1)
    expect(setStatusSpy).toHaveBeenCalledWith('idle')
    expect(currentStatus).toBe('idle')
  })

  it('after an "error" transition, the status flips back to idle after 5 s', () => {
    // This is the original bug — the previous code had *no* fallback
    // for the error path, so the indicator stayed red forever.
    const guard = createAgentStatusGuard(setStatus, {
      getStatus: () => currentStatus,
    })

    currentStatus = 'error'
    guard.recordTransition('error')

    vi.advanceTimersByTime(5000)
    expect(currentStatus).toBe('idle')
    expect(setStatusSpy).toHaveBeenCalledWith('idle')
  })

  it('a new "complete" transition cancels the prior pending timer', () => {
    const guard = createAgentStatusGuard(setStatus, {
      getStatus: () => currentStatus,
    })

    currentStatus = 'complete'
    guard.recordTransition('complete')
    vi.advanceTimersByTime(3000)
    expect(currentStatus).toBe('complete')

    // A second complete — e.g. the user triggered two runs back-to-back
    // — must reset the timer so we don't fire the first fallback.
    currentStatus = 'complete'
    guard.recordTransition('complete')

    vi.advanceTimersByTime(3000) // total 6 s since first record, 3 s since second
    expect(currentStatus).toBe('complete') // still waiting on the second

    vi.advanceTimersByTime(2000) // 5 s since second record
    expect(currentStatus).toBe('idle')
  })

  it('a non-terminal transition (e.g. "thinking") clears any pending fallback', () => {
    const guard = createAgentStatusGuard(setStatus, {
      getStatus: () => currentStatus,
    })

    currentStatus = 'complete'
    guard.recordTransition('complete')

    // Mid-flight the worker reports a new status — the prior complete
    // fallback must be cancelled.
    currentStatus = 'thinking'
    guard.recordTransition('thinking')

    vi.advanceTimersByTime(10000)
    // Never flipped to idle because the timer was cleared.
    expect(currentStatus).toBe('thinking')
    expect(setStatusSpy).not.toHaveBeenCalled()
  })

  it('the fallback is a safety net, not an override: if the caller already moved on, the timer no-ops', () => {
    const guard = createAgentStatusGuard(setStatus, {
      getStatus: () => currentStatus,
    })

    currentStatus = 'error'
    guard.recordTransition('error')

    // The user stops the run while the timer is pending. The store
    // moves to 'idle' on its own (ChatInputPanel calls
    // setAgentStatus('idle') on stop). The guard must not then
    // re-flip to idle (no harm) but the more important check is
    // that a *new* in-progress state is not clobbered.
    currentStatus = 'idle'
    guard.clear()
    guard.recordTransition('thinking')
    currentStatus = 'thinking' // simulating a new run that started mid-cancel
    guard.recordTransition('error') // and immediately errored
    currentStatus = 'thinking' // the worker recovered, transitioned back

    vi.advanceTimersByTime(10000)
    // The thinking state was set AFTER the error transition; the
    // guard saw the status had moved on and stayed silent.
    expect(currentStatus).toBe('thinking')
  })

  it('clear() cancels a pending timer without flipping the status', () => {
    const guard = createAgentStatusGuard(setStatus, {
      getStatus: () => currentStatus,
    })

    currentStatus = 'complete'
    guard.recordTransition('complete')
    guard.clear()

    vi.advanceTimersByTime(10000)
    expect(currentStatus).toBe('complete')
    expect(setStatusSpy).not.toHaveBeenCalled()
  })

  it('dispose() cancels a pending timer (used on unmount)', () => {
    const guard = createAgentStatusGuard(setStatus, {
      getStatus: () => currentStatus,
    })

    currentStatus = 'complete'
    guard.recordTransition('complete')
    guard.dispose()

    vi.advanceTimersByTime(10000)
    expect(currentStatus).toBe('complete')
    expect(setStatusSpy).not.toHaveBeenCalled()
  })

  it('respects a custom delay (used in tests, and reserved for future tuning)', () => {
    const guard = createAgentStatusGuard(setStatus, {
      getStatus: () => currentStatus,
      defaultDelayMs: 1234,
    })

    currentStatus = 'complete'
    guard.recordTransition('complete')
    vi.advanceTimersByTime(1233)
    expect(currentStatus).toBe('complete')
    vi.advanceTimersByTime(1)
    expect(currentStatus).toBe('idle')
  })

  it('the per-call delay argument overrides the default', () => {
    const guard = createAgentStatusGuard(setStatus, {
      getStatus: () => currentStatus,
      defaultDelayMs: 10000,
    })

    currentStatus = 'error'
    guard.recordTransition('error', 1000) // override

    vi.advanceTimersByTime(1000)
    expect(currentStatus).toBe('idle')
  })

  it('"idle" itself is non-terminal and clears any pending fallback', () => {
    const guard = createAgentStatusGuard(setStatus, {
      getStatus: () => currentStatus,
    })

    currentStatus = 'complete'
    guard.recordTransition('complete')
    currentStatus = 'idle'
    guard.recordTransition('idle')

    vi.advanceTimersByTime(10000)
    expect(setStatusSpy).not.toHaveBeenCalled()
  })
})
