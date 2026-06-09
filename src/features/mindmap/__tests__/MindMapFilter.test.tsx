import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MindMapFilter, { type MindMapFilterValue } from '../MindMapFilter'

const initial: MindMapFilterValue = {
  maxDepth: 0,
  onlyEdited: false,
}

describe('MindMapFilter', () => {
  it('renders a filter trigger button', () => {
    render(<MindMapFilter value={initial} onChange={() => {}} />)
    expect(screen.getByLabelText('筛选深度')).toBeInTheDocument()
  })

  it('opens the popover on click', () => {
    render(<MindMapFilter value={initial} onChange={() => {}} />)
    fireEvent.click(screen.getByLabelText('筛选深度'))
    expect(screen.getByTestId('mindmap-filter-popover')).toBeInTheDocument()
  })

  it('changes the depth slider and calls onChange with the new value', () => {
    const onChange = vi.fn()
    render(<MindMapFilter value={initial} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('筛选深度'))
    const slider = screen.getByTestId('mindmap-filter-depth') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '3' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as MindMapFilterValue
    expect(next.maxDepth).toBe(3)
  })

  it('reset button restores defaults (depth → 0, only-edited preserved → false)', () => {
    const dirty: MindMapFilterValue = {
      maxDepth: 4,
      onlyEdited: false,
    }
    const onChange = vi.fn()
    render(<MindMapFilter value={dirty} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('筛选深度'))
    fireEvent.click(screen.getByTestId('mindmap-filter-reset'))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as MindMapFilterValue
    expect(next.maxDepth).toBe(0)
    expect(next.onlyEdited).toBe(false)
  })

  it('click outside the popover dismisses it', () => {
    render(
      <div>
        <MindMapFilter value={initial} onChange={() => {}} />
        <div data-testid="outside">outside</div>
      </div>,
    )
    fireEvent.click(screen.getByLabelText('筛选深度'))
    expect(screen.getByTestId('mindmap-filter-popover')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByTestId('mindmap-filter-popover')).toBeNull()
  })

  it('reflects an active state when depth is non-zero', () => {
    const active: MindMapFilterValue = {
      maxDepth: 2,
      onlyEdited: false,
    }
    const { rerender } = render(<MindMapFilter value={initial} onChange={() => {}} />)
    const trigger = screen.getByLabelText('筛选深度')
    expect(trigger.className).not.toMatch(/text-primary/)
    rerender(<MindMapFilter value={active} onChange={() => {}} />)
    expect(screen.getByLabelText('筛选深度').className).toMatch(/text-primary/)
  })

  it('does NOT render a checkbox for "only edited" (removed from UI)', () => {
    render(<MindMapFilter value={initial} onChange={() => {}} />)
    fireEvent.click(screen.getByLabelText('筛选深度'))
    // The "only-edited" control was removed in the toolbar-flatten
    // pass. The field still exists on the value object for
    // backward compatibility, but the user no longer sees a
    // checkbox for it.
    expect(screen.queryByTestId('mindmap-filter-only-edited')).toBeNull()
  })
})
