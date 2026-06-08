import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MindMapSearch from '../MindMapSearch'

describe('MindMapSearch', () => {
  it('renders a search input with a placeholder', () => {
    render(<MindMapSearch query="" onQueryChange={() => {}} />)
    expect(screen.getByRole('textbox', { name: '搜索节点' })).toBeInTheDocument()
  })

  it('calls onQueryChange when the user types', () => {
    const onQueryChange = vi.fn()
    render(<MindMapSearch query="" onQueryChange={onQueryChange} />)
    const input = screen.getByRole('textbox', { name: '搜索节点' })
    fireEvent.change(input, { target: { value: 'react' } })
    expect(onQueryChange).toHaveBeenCalledWith('react')
  })

  it('shows a clear (×) button only when the query is non-empty', () => {
    const { rerender } = render(<MindMapSearch query="" onQueryChange={() => {}} />)
    expect(screen.queryByLabelText('清空搜索')).toBeNull()
    rerender(<MindMapSearch query="react" onQueryChange={() => {}} />)
    expect(screen.getByLabelText('清空搜索')).toBeInTheDocument()
  })

  it('clears the query when the clear (×) button is clicked', () => {
    const onQueryChange = vi.fn()
    render(<MindMapSearch query="react" onQueryChange={onQueryChange} />)
    fireEvent.click(screen.getByLabelText('清空搜索'))
    expect(onQueryChange).toHaveBeenCalledWith('')
  })

  it('calls onEnter when the user hits Enter', () => {
    const onEnter = vi.fn()
    const onQueryChange = vi.fn()
    render(<MindMapSearch query="react" onQueryChange={onQueryChange} onEnter={onEnter} />)
    const input = screen.getByRole('textbox', { name: '搜索节点' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it('clears the query when the user hits Esc', () => {
    const onQueryChange = vi.fn()
    render(<MindMapSearch query="react" onQueryChange={onQueryChange} />)
    const input = screen.getByRole('textbox', { name: '搜索节点' })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onQueryChange).toHaveBeenCalledWith('')
  })

  it('shows a match-count badge when matchCount is provided', () => {
    render(<MindMapSearch query="react" onQueryChange={() => {}} matchCount={3} />)
    expect(screen.getByLabelText('3 个匹配')).toBeInTheDocument()
  })

  it('does not show a match-count badge when matchCount is undefined', () => {
    render(<MindMapSearch query="react" onQueryChange={() => {}} />)
    expect(screen.queryByLabelText(/\d+ 个匹配/)).toBeNull()
  })
})
