import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MindMapFilter, { MindMapFilterBody, type MindMapFilterValue } from '../MindMapFilter'

const initial: MindMapFilterValue = {
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
      maxDepth: 4,
      onlyEdited: true,
    }
    const onChange = vi.fn()
    render(<MindMapFilter value={dirty} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('筛选'))
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
    fireEvent.click(screen.getByLabelText('筛选'))
    expect(screen.getByTestId('mindmap-filter-popover')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByTestId('mindmap-filter-popover')).toBeNull()
  })

  it('reflects an active state when any rule is non-default', () => {
    const active: MindMapFilterValue = {
      maxDepth: 0,
      onlyEdited: true,
    }
    const { rerender } = render(<MindMapFilter value={initial} onChange={() => {}} />)
    const trigger = screen.getByLabelText('筛选')
    expect(trigger.className).not.toMatch(/text-primary/)
    rerender(<MindMapFilter value={active} onChange={() => {}} />)
    expect(screen.getByLabelText('筛选').className).toMatch(/text-primary/)
  })
})

describe('MindMapFilterBody', () => {
  it('renders without a trigger button (inline use case)', () => {
    // The body is meant to be embedded inside a host that already
    // provides its own chrome (e.g. a Base UI <DropdownMenuContent>).
    // No "筛选" trigger button should appear — only the controls.
    render(<MindMapFilterBody value={initial} onChange={() => {}} />)
    expect(screen.queryByLabelText('筛选')).toBeNull()
    expect(screen.getByTestId('mindmap-filter-body')).toBeInTheDocument()
    expect(screen.getByTestId('mindmap-filter-only-edited')).toBeInTheDocument()
    expect(screen.getByTestId('mindmap-filter-depth')).toBeInTheDocument()
    expect(screen.getByTestId('mindmap-filter-reset')).toBeInTheDocument()
  })

  it('does NOT render a pattern checkbox (pattern is mindmap-level, not per-node)', () => {
    // Earlier revisions had a "Pattern" multi-select (5W1H / tech /
    // pros-cons). It was a black-box filter — the pattern is a
    // mindmap-level attribute, not a per-node marker — so the
    // v2 cleanup removes the UI entirely.
    render(<MindMapFilterBody value={initial} onChange={() => {}} />)
    expect(screen.queryByTestId('mindmap-filter-pattern-tech')).toBeNull()
    expect(screen.queryByTestId('mindmap-filter-pattern-5w1h')).toBeNull()
    expect(screen.queryByTestId('mindmap-filter-pattern-pros-cons')).toBeNull()
  })

  it('forwards onChange when the edited checkbox is toggled', () => {
    const onChange = vi.fn()
    render(<MindMapFilterBody value={initial} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('mindmap-filter-only-edited'))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as MindMapFilterValue
    expect(next.onlyEdited).toBe(true)
  })

  it('forwards onChange when the depth slider changes', () => {
    const onChange = vi.fn()
    render(<MindMapFilterBody value={initial} onChange={onChange} />)
    const slider = screen.getByTestId('mindmap-filter-depth') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '2' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as MindMapFilterValue
    expect(next.maxDepth).toBe(2)
  })

  it('forwards onChange when the reset button is clicked', () => {
    const dirty: MindMapFilterValue = {
      maxDepth: 4,
      onlyEdited: true,
    }
    const onChange = vi.fn()
    render(<MindMapFilterBody value={dirty} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('mindmap-filter-reset'))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]?.[0] as MindMapFilterValue
    expect(next.maxDepth).toBe(0)
    expect(next.onlyEdited).toBe(false)
  })

  it('stops click propagation so the host menu does not dismiss', () => {
    // When the body is embedded inside a Base UI Menu, every
    // click on a child would otherwise bubble up and Base UI's
    // outside-click handler would close the menu before the user
    // can interact with the controls. The body installs a
    // stop-propagation guard on its outer wrapper to keep the
    // menu open while the user is configuring the filter.
    const onMenuDismiss = vi.fn()
    render(
      <div onClick={onMenuDismiss}>
        <MindMapFilterBody value={initial} onChange={() => {}} />
      </div>,
    )
    fireEvent.click(screen.getByTestId('mindmap-filter-only-edited'))
    expect(onMenuDismiss).not.toHaveBeenCalled()
  })
})
