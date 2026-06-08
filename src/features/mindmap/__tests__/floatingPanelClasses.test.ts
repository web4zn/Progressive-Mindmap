import { describe, it, expect } from 'vitest'
import {
  FLOATING_PANEL_BASE_CLASSES,
  FLOATING_PANEL_OPEN_CLASSES,
  FLOATING_PANEL_CLOSED_CLASSES,
} from '../floatingPanelClasses'

describe('floatingPanelClasses', () => {
  it('exports non-empty base / open / closed class strings', () => {
    expect(FLOATING_PANEL_BASE_CLASSES).toBeTruthy()
    expect(FLOATING_PANEL_OPEN_CLASSES).toBeTruthy()
    expect(FLOATING_PANEL_CLOSED_CLASSES).toBeTruthy()
    expect(typeof FLOATING_PANEL_BASE_CLASSES).toBe('string')
    expect(typeof FLOATING_PANEL_OPEN_CLASSES).toBe('string')
    expect(typeof FLOATING_PANEL_CLOSED_CLASSES).toBe('string')
  })

  it('base classes anchor the panel to the canvas top-right', () => {
    expect(FLOATING_PANEL_BASE_CLASSES).toContain('absolute')
    expect(FLOATING_PANEL_BASE_CLASSES).toContain('top-3')
    expect(FLOATING_PANEL_BASE_CLASSES).toContain('right-3')
  })

  it('open state is fully visible and clickable', () => {
    expect(FLOATING_PANEL_OPEN_CLASSES).toContain('opacity-100')
    expect(FLOATING_PANEL_OPEN_CLASSES).toContain('pointer-events-auto')
  })

  it('closed state is hidden and ignored by hit-testing', () => {
    expect(FLOATING_PANEL_CLOSED_CLASSES).toContain('opacity-0')
    expect(FLOATING_PANEL_CLOSED_CLASSES).toContain('pointer-events-none')
  })

  it('both states share the same transition spec (no flicker on first frame)', () => {
    expect(FLOATING_PANEL_BASE_CLASSES).toContain('transition-all')
    expect(FLOATING_PANEL_BASE_CLASSES).toContain('duration-200')
    expect(FLOATING_PANEL_BASE_CLASSES).toContain('ease-out')
  })
})
