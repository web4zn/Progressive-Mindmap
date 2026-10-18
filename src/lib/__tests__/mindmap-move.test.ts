import { describe, it, expect } from 'vitest'
import { canMoveUp, canMoveDown } from '../mindmap-move'

describe('canMoveUp', () => {
  it('is disabled for the first sibling and enabled otherwise', () => {
    expect(canMoveUp(0)).toBe(false)
    expect(canMoveUp(1)).toBe(true)
    expect(canMoveUp(7)).toBe(true)
  })

  it('treats a missing index as disabled', () => {
    expect(canMoveUp(-1)).toBe(false)
  })
})

describe('canMoveDown', () => {
  it('is disabled for the last sibling and enabled otherwise', () => {
    expect(canMoveDown(0, 3)).toBe(true)
    expect(canMoveDown(1, 3)).toBe(true)
    expect(canMoveDown(2, 3)).toBe(false)
  })

  it('is disabled for a single sibling', () => {
    expect(canMoveDown(0, 1)).toBe(false)
  })

  it('treats a missing index as disabled', () => {
    expect(canMoveDown(-1, 3)).toBe(false)
  })
})
