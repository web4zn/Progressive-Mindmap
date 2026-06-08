import { describe, it, expect } from 'vitest'
import {
  firstLabelChar,
  firstLabelCharFromNode,
  previewLabel,
} from '@/lib/flow-minimap-label'
import type { Node } from '@xyflow/react'

describe('firstLabelChar', () => {
  it('returns the first non-whitespace character of an ASCII label', () => {
    expect(firstLabelChar('Hello world')).toBe('H')
  })

  it('skips leading whitespace', () => {
    expect(firstLabelChar('   spaced')).toBe('s')
  })

  it('returns the first CJK character', () => {
    expect(firstLabelChar('思维导图')).toBe('思')
  })

  it('returns null for an empty label', () => {
    expect(firstLabelChar('')).toBeNull()
  })

  it('returns null for a whitespace-only label', () => {
    expect(firstLabelChar('   ')).toBeNull()
  })

  it('returns null for non-string input', () => {
    expect(firstLabelChar(null)).toBeNull()
    expect(firstLabelChar(undefined)).toBeNull()
    expect(firstLabelChar(42 as unknown as string)).toBeNull()
  })

  it('handles surrogate pairs (e.g. emoji) as a single glyph', () => {
    // 🧠 (U+1F9E0) is encoded as a surrogate pair in UTF-16. Our
    // helper must reconstruct it via `String.fromCodePoint` so the
    // minimap doesn't show half a glyph.
    expect(firstLabelChar('🧠 brain')).toBe('🧠')
  })
})

describe('firstLabelCharFromNode', () => {
  it('reads `data.label` when present', () => {
    const node = { data: { label: 'Root' } } as unknown as Node
    expect(firstLabelCharFromNode(node)).toBe('R')
  })

  it('returns null when `data` is missing', () => {
    const node = {} as unknown as Node
    expect(firstLabelCharFromNode(node)).toBeNull()
  })

  it('returns null when `data.label` is not a string', () => {
    const node = { data: { label: 42 } } as unknown as Node
    expect(firstLabelCharFromNode(node)).toBeNull()
  })

  it('handles a CJK label', () => {
    const node = { data: { label: '应用层' } } as unknown as Node
    expect(firstLabelCharFromNode(node)).toBe('应')
  })
})

describe('previewLabel', () => {
  it('is currently an alias for firstLabelCharFromNode', () => {
    const node = { data: { label: 'Mind' } } as unknown as Node
    expect(previewLabel(node)).toBe('M')
  })

  it('returns null for missing label', () => {
    expect(previewLabel({ data: {} } as unknown as Node)).toBeNull()
  })
})
