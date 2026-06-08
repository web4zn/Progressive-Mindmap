import { describe, it, expect, beforeEach } from 'vitest'
import {
  getNodeShape,
  listNodeShapes,
  registerNodeShape,
  hasNodeShape,
  __resetNodeShapeRegistryForTests,
} from '../shapes/registry'
import { resolveShapeName, type NodeShape } from '../shapes/types'

beforeEach(() => {
  __resetNodeShapeRegistryForTests()
})

describe('resolveShapeName', () => {
  it("returns 'rect' for the canonical name", () => {
    expect(resolveShapeName('rect')).toBe('rect')
  })

  it("falls back to 'rect' for any other string (legacy shapes collapse to rect)", () => {
    // Legacy persisted mindmaps may carry `chip` / `circle` /
    // `stadium` from before the v2 cleanup; the resolver should
    // collapse them all to the single canonical presentation.
    expect(resolveShapeName('chip')).toBe('rect')
    expect(resolveShapeName('circle')).toBe('rect')
    expect(resolveShapeName('stadium')).toBe('rect')
    expect(resolveShapeName('hexagon')).toBe('rect')
    expect(resolveShapeName('')).toBe('rect')
  })

  it("falls back to 'rect' for non-strings", () => {
    expect(resolveShapeName(null)).toBe('rect')
    expect(resolveShapeName(undefined)).toBe('rect')
    expect(resolveShapeName(42)).toBe('rect')
    expect(resolveShapeName({})).toBe('rect')
  })
})

describe('getNodeShape', () => {
  it("returns the rect shape for its canonical name", () => {
    expect(getNodeShape('rect').name).toBe('rect')
  })

  it("falls back to 'rect' for unknown names — never throws", () => {
    expect(getNodeShape('hexagon').name).toBe('rect')
    expect(getNodeShape('chip').name).toBe('rect')
    expect(getNodeShape('circle').name).toBe('rect')
    expect(getNodeShape('stadium').name).toBe('rect')
    expect(getNodeShape(null).name).toBe('rect')
    expect(getNodeShape(undefined).name).toBe('rect')
  })
})

describe('listNodeShapes', () => {
  it('returns only the rect shape (others were removed in v2 cleanup)', () => {
    const names = listNodeShapes().map((s) => s.name)
    expect(names).toEqual(['rect'])
  })

  it('reflects registration updates', () => {
    const original = listNodeShapes().length
    const replacement: NodeShape = {
      name: 'rect',
      description: 'replacement',
      defaultSize: { width: 1, height: 1 },
      patternWeight: 0,
      handles: [],
      computeSize: () => ({ width: 1, height: 1 }),
      nodeComponent: () => null,
    }
    registerNodeShape(replacement)
    expect(listNodeShapes().length).toBe(original) // replacement, not addition
    expect(getNodeShape('rect').description).toBe('replacement')
  })
})

describe('registerNodeShape', () => {
  it('replaces the existing rect shape', () => {
    const replacement: NodeShape = {
      name: 'rect',
      description: 'tweaked',
      defaultSize: { width: 999, height: 999 },
      patternWeight: 0.5,
      handles: [],
      computeSize: () => ({ width: 1, height: 1 }),
      nodeComponent: () => null,
    }
    registerNodeShape(replacement)
    expect(getNodeShape('rect').defaultSize).toEqual({ width: 999, height: 999 })
  })
})

describe('hasNodeShape', () => {
  it('returns true for the registered name', () => {
    expect(hasNodeShape('rect')).toBe(true)
  })

  it('returns false for legacy / unknown names', () => {
    expect(hasNodeShape('hexagon')).toBe(false)
    expect(hasNodeShape('chip')).toBe(false)
    expect(hasNodeShape('circle')).toBe(false)
    expect(hasNodeShape('stadium')).toBe(false)
    expect(hasNodeShape(null)).toBe(false)
    expect(hasNodeShape(42)).toBe(false)
  })
})

describe('computeSize — pure', () => {
  it('returns the same size for the same input', () => {
    const shape = getNodeShape('rect')
    const input = {
      label: 'Hello',
      summary: 'world',
      hasHtml: false,
      hasChildren: true,
      depth: 1,
    }
    const a = shape.computeSize(input)
    const b = shape.computeSize(input)
    expect(a).toEqual(b)
  })

  it('clamps to the rect bounds', () => {
    const rect = getNodeShape('rect')
    const huge = rect.computeSize({
      label: 'x'.repeat(10_000),
      summary: 'y'.repeat(10_000),
      hasHtml: false,
      hasChildren: true,
      depth: 1,
    })
    // Rect max width is 280; max height is 160 (per registry's
    // `clamp` upper bound for the text path).
    expect(huge.width).toBeLessThanOrEqual(280)
    expect(huge.height).toBeLessThanOrEqual(160)
  })
})
