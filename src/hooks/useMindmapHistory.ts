import { useCallback, useRef, useState } from 'react'
import type { MindMapNode } from '../types/mindmap'

/**
 * Stage A2 — undo / redo for the mindmap canvas.
 *
 * A minimal in-memory stack of full-tree snapshots. The hook is *outside*
 * the store on purpose: the store is the source of truth and the hook is
 * a presentation-layer cursor into the recent past. Collapsing /
 * expanding a node is intentionally NOT a history event — those UI
 * toggles are noisy and don't change persisted state.
 *
 * The hook returns the current `present` snapshot plus `record / undo /
 * redo / clear` mutators. It also exposes `canUndo` / `canRedo` derived
 * from the stack depths so the renderer can disable menu items / hotkey
 * handlers when there's nothing to go back to.
 *
 * `present` is intentionally `null` until the first `record()` call —
 * the canvas can still render and accept hotkeys, but undo is disabled
 * because there is no "before" state to restore.
 */

export interface MindmapSnapshot {
  /** The mindmap this snapshot belongs to. Switching the active mindmap
   *  should reset history (not yet wired in A2 — orthogonal follow-up). */
  mindmapId: string
  /** Deep-clone-friendly plain object tree. Persistable to IndexedDB. */
  tree: MindMapNode[]
}

export interface UseMindmapHistoryOptions {
  /** Cap on the past stack. Oldest entries are dropped first. Defaults to 50. */
  capacity?: number
}

export interface UseMindmapHistoryResult {
  present: MindmapSnapshot | null
  canUndo: boolean
  canRedo: boolean
  /** Push the current `present` onto the past stack, then replace `present`
   *  with `snapshot`. Drops the future (linear history). */
  record: (snapshot: MindmapSnapshot) => void
  /** Pop the most recent past entry, push the current present onto
   *  future, and return the new present. Returns null when there is
   *  nothing to undo (past is empty) so the caller can short-circuit
   *  without writing to the store. */
  undo: () => MindmapSnapshot | null
  /** Symmetric to `undo()` but for the future stack. */
  redo: () => MindmapSnapshot | null
  /** Drop all history. Keeps the current `present`. Used when the
   *  active mindmap changes and the old timeline no longer applies. */
  clear: () => void
}

const DEFAULT_CAPACITY = 50

export function useMindmapHistory(options: UseMindmapHistoryOptions = {}): UseMindmapHistoryResult {
  const capacity = options.capacity ?? DEFAULT_CAPACITY

  // Use a ref for the stacks so the mutator callbacks can be stable
  // (the consumer wires them into a `useEffect`/`useCallback` and would
  // otherwise re-run on every state change).
  const pastRef = useRef<MindmapSnapshot[]>([])
  const futureRef = useRef<MindmapSnapshot[]>([])

  // The "present" lives in state because consumers render based on it.
  const [present, setPresent] = useState<MindmapSnapshot | null>(null)
  // Mirror depths in state so canUndo / canRedo can re-render the UI.
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const record = useCallback(
    (snapshot: MindmapSnapshot) => {
      // Commit the current present to past before swapping. The first
      // record() has no present yet → past stays empty and the new
      // snapshot becomes the seed of the timeline.
      if (present) {
        pastRef.current.push(present)
        if (pastRef.current.length > capacity) {
          pastRef.current.splice(0, pastRef.current.length - capacity)
        }
      }
      futureRef.current = []
      setPresent(snapshot)
      setCanUndo(pastRef.current.length > 0)
      setCanRedo(false)
    },
    [present, capacity],
  )

  const undo = useCallback((): MindmapSnapshot | null => {
    const previous = pastRef.current.pop()
    if (!previous) return null
    // Push the current present onto the future stack.
    if (present) {
      futureRef.current.push(present)
    }
    setPresent(previous)
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(futureRef.current.length > 0)
    return previous
  }, [present])

  const redo = useCallback((): MindmapSnapshot | null => {
    const next = futureRef.current.pop()
    if (!next) return null
    if (present) {
      pastRef.current.push(present)
    }
    setPresent(next)
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(futureRef.current.length > 0)
    return next
  }, [present])

  const clear = useCallback(() => {
    pastRef.current = []
    futureRef.current = []
    setCanUndo(false)
    setCanRedo(false)
  }, [])

  return { present, canUndo, canRedo, record, undo, redo, clear }
}
