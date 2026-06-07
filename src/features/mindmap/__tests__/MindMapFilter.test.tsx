import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MindMapFilter, { type MindMapFilterValue } from '../MindMapFilter'

const initial: MindMapFilterValue = {
  patterns: new Set(),
  maxDepth: 0,
  onlyEdited: false,
}

describe('MindMapFilter', () => {
  it('renders a filter trigger button', () => {
    render(<MindMapFilter value={initial} onChange={() => {}} />)
    expect(screen.getByLabelText('筛选')).toBeInTheDocument()
  })

  it('opens the popover on click', () => {
    render(<MindMapFilter value={initial} onChange={() => {}} />)
    fireEvent.click(screen.getByLabelText('筛选'))
    expect(screen.getByTestId('mindmap-filter-popover')).toBeInTheDocument()
  })

  it('toggles a pattern checkbox and calls onChange', () => {
    const onChange = vi.fn()
    render(<MindMapFilter value={initial} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('筛选'))
    const tech = screen.getByTestId('mindmap-filter-pattern-tech')
    fireEvent.click(tech)
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as MindMapFilterValue
    expect(next.patterns.has('tech')).toBe(true)
  })

  it('toggles the edited checkbox and calls onChange', () => {
    const onChange = vi.fn()
    render(<MindMapFilter value={initial} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('筛选'))
    fireEvent.click(screen.getByTestId('mindmap-filter-only-edited'))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as MindMapFilterValue
    expect(next.onlyEdited).toBe(true)
  })

  it('changes the depth slider and calls onChange with the new value', () => {
    const onChange = vi.fn()
    render(<MindMapFilter value={initial} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('筛选'))
    const slider = screen.getByTestId('mindmap-filter-depth') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '3' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as MindMapFilterValue
    expect(next.maxDepth).toBe(3)
  })

  it('reset button restores defaults', () => {
    const dirty: MindMapFilterValue = {
      patterns: new Set(['tech', '5w1h']),
      maxDepth: 4,
      onlyEdited: true,
    }
    const onChange = vi.fn()
    render(<MindMapFilter value={dirty} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('筛选'))
    fireEvent.click(screen.getByLabelText('重置筛选'))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as MindMapFilterValue
    expect(next.patterns.size).toBe(0)
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
    fireEvent.click(screen.getByLabelText('筛选'))
    expect(screen.getByTestId('mindmap-filter-popover')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByTestId('mindmap-filter-popover')).toBeNull()
  })

  it('reflects an active state when any rule is non-default', () => {
    const active: MindMapFilterValue = {
      patterns: new Set(['tech']),
      maxDepth: 0,
      onlyEdited: false,
    }
    const { rerender } = render(<MindMapFilter value={initial} onChange={() => {}} />)
    const trigger = screen.getByLabelText('筛选')
    expect(trigger.className).not.toMatch(/text-primary/)
    rerender(<MindMapFilter value={active} onChange={() => {}} />)
    expect(screen.getByLabelText('筛选').className).toMatch(/text-primary/)
  })
})
