import { describe, it, expect, beforeEach } from 'vitest'
import {
  getEdgeStrategy,
  listEdgeStrategies,
  registerEdgeStrategy,
  hasEdgeStrategy,
  __resetEdgeStrategyRegistryForTests,
} from '../edges/registry'
import {
  isEdgeStyleName,
  resolveEdgeStyleName,
  type EdgeStrategy,
} from '../edges/types'

beforeEach(() => {
  __resetEdgeStrategyRegistryForTests()
})

describe('isEdgeStyleName', () => {
  it('accepts the three canonical names', () => {
    expect(isEdgeStyleName('smoothstep')).toBe(true)
    expect(isEdgeStyleName('bezier')).toBe(true)
    expect(isEdgeStyleName('straight')).toBe(true)
  })

  it('rejects unknown strings and non-strings', () => {
    expect(isEdgeStyleName('curved')).toBe(false)
    expect(isEdgeStyleName('')).toBe(false)
    expect(isEdgeStyleName(null)).toBe(false)
    expect(isEdgeStyleName(undefined)).toBe(false)
    expect(isEdgeStyleName(42)).toBe(false)
  })
})

describe('resolveEdgeStyleName', () => {
  it("falls back to 'smoothstep' for invalid input", () => {
    expect(resolveEdgeStyleName('curved')).toBe('smoothstep')
    expect(resolveEdgeStyleName(null)).toBe('smoothstep')
    expect(resolveEdgeStyleName(undefined)).toBe('smoothstep')
  })

  it('returns the input when valid', () => {
    expect(resolveEdgeStyleName('bezier')).toBe('bezier')
  })
})

describe('getEdgeStrategy', () => {
  it('returns the canonical strategy for each of the three names', () => {
    expect(getEdgeStrategy('smoothstep').name).toBe('smoothstep')
    expect(getEdgeStrategy('bezier').name).toBe('bezier')
    expect(getEdgeStrategy('straight').name).toBe('straight')
  })

  it("falls back to 'smoothstep' for unknown names", () => {
    expect(getEdgeStrategy('curved').name).toBe('smoothstep')
    expect(getEdgeStrategy(null).name).toBe('smoothstep')
  })
})

describe('listEdgeStrategies', () => {
  it('returns all three built-in strategies in declaration order', () => {
    const names = listEdgeStrategies().map((s) => s.name)
    expect(names).toEqual(['smoothstep', 'bezier', 'straight'])
  })

  it('reflects registration updates', () => {
    const replacement: EdgeStrategy = {
      name: 'smoothstep',
      description: 'replaced',
      defaultMarker: 'dot',
      animation: 'pulse',
      supportsFlow: true,
      edgeComponent: () => null,
    }
    registerEdgeStrategy(replacement)
    expect(listEdgeStrategies().length).toBe(3) // replacement, not addition
    expect(getEdgeStrategy('smoothstep').description).toBe('replaced')
    expect(getEdgeStrategy('smoothstep').defaultMarker).toBe('dot')
  })
})

describe('hasEdgeStrategy', () => {
  it('returns true for registered names', () => {
    expect(hasEdgeStrategy('smoothstep')).toBe(true)
    expect(hasEdgeStrategy('bezier')).toBe(true)
  })

  it('returns false for unknown names', () => {
    expect(hasEdgeStrategy('curved')).toBe(false)
    expect(hasEdgeStrategy(null)).toBe(false)
  })
})

describe('strategy capabilities', () => {
  it('every default strategy supports flow arrows', () => {
    for (const s of listEdgeStrategies()) {
      expect(s.supportsFlow).toBe(true)
    }
  })

  it("every default strategy draws an 'arrow' marker by default", () => {
    for (const s of listEdgeStrategies()) {
      expect(s.defaultMarker).toBe('arrow')
    }
  })

  it("'straight' explicitly opts out of animation", () => {
    expect(getEdgeStrategy('straight').animation).toBe('none')
  })

  it("'smoothstep' and 'bezier' support the 'flow' animation", () => {
    expect(getEdgeStrategy('smoothstep').animation).toBe('flow')
    expect(getEdgeStrategy('bezier').animation).toBe('flow')
  })
})
