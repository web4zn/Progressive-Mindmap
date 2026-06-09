import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MindMapFilter, { type MindMapFilterValue } from '../MindMapFilter'

const initial: MindMapFilterValue = {
  maxDepth: 0,
  onlyEdited: false,
}

describe('MindMapFilter (inline depth slider)', () => {
  it('renders the slider and current value inline — no popover, no trigger', () => {
    render(<MindMapFilter value={initial} onChange={() => {}} />)
    // Slider is rendered directly; no need to click anything.
    expect(screen.getByTestId('mindmap-filter-depth')).toBeInTheDocument()
    // No trigger button (the popover wrapper is gone).
    expect(screen.queryByRole('button', { name: '筛选' })).toBeNull()
    expect(screen.queryByTestId('mindmap-filter-popover')).toBeNull()
    // "不限" label means the depth is 0 / unfiltered.
    expect(screen.getByTestId('mindmap-filter-value')).toHaveTextContent('不限')
  })

  it('shows the numeric depth when maxDepth is non-zero', () => {
    render(
      <MindMapFilter
        value={{ maxDepth: 3, onlyEdited: false }}
        onChange={() => {}}
      />,
    )
    expect(screen.getByTestId('mindmap-filter-value')).toHaveTextContent('3')
  })

  it('calls onChange with the new depth when the slider changes', () => {
    const onChange = vi.fn()
    render(<MindMapFilter value={initial} onChange={onChange} />)
    const slider = screen.getByTestId('mindmap-filter-depth') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '2' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as MindMapFilterValue
    expect(next.maxDepth).toBe(2)
  })

  it('highlights the wrapper when depth is non-zero (visual "active" cue)', () => {
    const { rerender } = render(<MindMapFilter value={initial} onChange={() => {}} />)
    const wrapper = screen.getByTestId('mindmap-filter')
    expect(wrapper.className).not.toMatch(/bg-accent/)
    rerender(
      <MindMapFilter
        value={{ maxDepth: 2, onlyEdited: false }}
        onChange={() => {}}
      />,
    )
    expect(screen.getByTestId('mindmap-filter').className).toMatch(/bg-accent/)
  })

  it('does NOT render a checkbox for "only edited" (removed from UI)', () => {
    render(<MindMapFilter value={initial} onChange={() => {}} />)
    // The "only-edited" control was removed in the toolbar-flatten
    // pass. The field still exists on the value object for
    // backward compatibility with persisted data, but the user
    // no longer sees a checkbox for it.
    expect(screen.queryByTestId('mindmap-filter-only-edited')).toBeNull()
  })
})
