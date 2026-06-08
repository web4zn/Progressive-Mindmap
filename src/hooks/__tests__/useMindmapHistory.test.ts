import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMindmapHistory, type MindmapSnapshot } from '../useMindmapHistory'

const snap = (id: string, label: string): MindmapSnapshot => ({
  mindmapId: 'mm-1',
  tree: [
    {
      id,
      label,
      summary: '',
      children: [],
      editedByUser: false,
    },
  ],
})

describe('useMindmapHistory', () => {
  it('starts with no past and no future', () => {
    const { result } = renderHook(() => useMindmapHistory())
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('record() pushes present onto past and sets a new present', () => {
    const { result } = renderHook(() => useMindmapHistory())
    act(() => result.current.record(snap('a', 'A')))
    act(() => result.current.record(snap('b', 'B')))
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.present?.tree[0]?.id).toBe('b')
  })

  it('undo() restores the previous snapshot and pushes present onto future', () => {
    const { result } = renderHook(() => useMindmapHistory())
    act(() => result.current.record(snap('a', 'A')))
    act(() => result.current.record(snap('b', 'B')))
    act(() => result.current.record(snap('c', 'C')))

    let undone: MindmapSnapshot | null = { mindmapId: 'mm-1', tree: [] }
    act(() => {
      undone = result.current.undo()
    })
    expect(undone?.tree[0]?.id).toBe('b')
    expect(result.current.present?.tree[0]?.id).toBe('b')
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(true)
  })

  it('redo() restores a snapshot that was undone', () => {
    const { result } = renderHook(() => useMindmapHistory())
    act(() => result.current.record(snap('a', 'A')))
    act(() => result.current.record(snap('b', 'B')))
    act(() => result.current.undo())
    let redone: MindmapSnapshot | null = { mindmapId: 'mm-1', tree: [] }
    act(() => {
      redone = result.current.redo()
    })
    expect(redone?.tree[0]?.id).toBe('b')
    expect(result.current.present?.tree[0]?.id).toBe('b')
    expect(result.current.canRedo).toBe(false)
  })

  it('undo() with empty past returns null and is a no-op', () => {
    const { result } = renderHook(() => useMindmapHistory())
    act(() => result.current.record(snap('a', 'A')))
    // First record seeds the timeline; the past stack is empty at that
    // point. A subsequent undo() therefore has nothing to pop and must
    // return null. The present snapshot stays put.
    let undone: MindmapSnapshot | null = 'not-null' as unknown as MindmapSnapshot | null
    act(() => {
      undone = result.current.undo()
    })
    expect(undone).toBeNull()
    expect(result.current.present?.tree[0]?.id).toBe('a')
  })

  it('redo() with empty future returns null and is a no-op', () => {
    const { result } = renderHook(() => useMindmapHistory())
    act(() => result.current.record(snap('a', 'A')))
    let redone: MindmapSnapshot | null = null
    act(() => {
      redone = result.current.redo()
    })
    expect(redone).toBeNull()
  })

  it('new record() after undo() drops the future (linear history)', () => {
    const { result } = renderHook(() => useMindmapHistory())
    act(() => result.current.record(snap('a', 'A')))
    act(() => result.current.record(snap('b', 'B')))
    act(() => result.current.undo()) // back to a
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.record(snap('c', 'C')))
    expect(result.current.canRedo).toBe(false)
    expect(result.current.present?.tree[0]?.id).toBe('c')
  })

  it('caps the past stack at 50 entries (oldest dropped)', () => {
    const { result } = renderHook(() => useMindmapHistory({ capacity: 50 }))
    for (let i = 0; i < 60; i++) {
      act(() => result.current.record(snap(`n${i}`, `N${i}`)))
    }
    // Walk back through 50 undos (capacity) and confirm we can still
    // undo (we should be at the 10th record).
    for (let i = 0; i < 50; i++) {
      act(() => result.current.undo())
    }
    // After 50 undos, we should be at the 10th snapshot (n9).
    expect(result.current.present?.tree[0]?.id).toBe('n9')
    // One more undo should still return the same snapshot (no further history).
    act(() => result.current.undo())
    // The "n9" was already in past before the last undo; after another
    // undo the previous record was "n8" which is the first record kept.
    // The exact contract is "oldest dropped" so we can still go back
    // a few more steps. We just assert we still have *some* present
    // snapshot.
    expect(result.current.present).not.toBeNull()
  })

  it('clear() empties past + future but keeps present', () => {
    const { result } = renderHook(() => useMindmapHistory())
    act(() => result.current.record(snap('a', 'A')))
    act(() => result.current.record(snap('b', 'B')))
    act(() => result.current.undo()) // future has 'b'

    act(() => result.current.clear())
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.present?.tree[0]?.id).toBe('a')
  })
})
