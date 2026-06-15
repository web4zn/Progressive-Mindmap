import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DrillBreadcrumb from '../DrillBreadcrumb'
import type { MindMapNode } from '@/types/mindmap'

function makeNode(overrides: Partial<MindMapNode> = {}): MindMapNode {
  return {
    id: overrides.id ?? 'n1',
    label: overrides.label ?? 'Test',
    summary: overrides.summary ?? '',
    children: overrides.children ?? [],
    editedByUser: overrides.editedByUser ?? false,
  }
}

describe('DrillBreadcrumb', () => {
  it('renders nothing when drillNodeId is not in the tree (no chain)', () => {
    const tree = [makeNode({ id: 'root', label: 'Root' })]
    const { container } = render(
      <DrillBreadcrumb tree={tree} drillNodeId="nonexistent" onNavigate={vi.fn()} />,
    )
    expect(screen.queryByTestId('drill-breadcrumb')).toBeNull()
    expect(container.innerHTML).toBe('')
  })

  it('renders breadcrumb for a root node', () => {
    const tree = [makeNode({ id: 'root', label: 'Root' })]
    render(<DrillBreadcrumb tree={tree} drillNodeId="root" onNavigate={vi.fn()} />)

    expect(screen.getByTestId('drill-breadcrumb')).toBeInTheDocument()
    expect(screen.getByText('全部')).toBeInTheDocument()
    // Root node is the current page — rendered as span, not button.
    expect(screen.getByText('Root')).toBeInTheDocument()
    expect(screen.getByText('Root').tagName).toBe('SPAN')
  })

  it('renders breadcrumb chain for a 3-level deep node', () => {
    const tree = [
      makeNode({
        id: 'r',
        label: 'Root',
        children: [
          makeNode({
            id: 'a',
            label: 'Alpha',
            children: [
              makeNode({
                id: 'b',
                label: 'Beta',
                children: [makeNode({ id: 'c', label: 'Gamma' })],
              }),
            ],
          }),
        ],
      }),
    ]
    render(<DrillBreadcrumb tree={tree} drillNodeId="b" onNavigate={vi.fn()} />)

    expect(screen.getByText('Root')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    // Gamma should NOT appear since we're drilled at Beta.
    expect(screen.queryByText('Gamma')).toBeNull()
  })

  it('calls onNavigate(null) when clicking 全部', async () => {
    const onNavigate = vi.fn()
    const tree = [
      makeNode({
        id: 'root',
        label: 'Root',
        children: [makeNode({ id: 'child', label: 'Child' })],
      }),
    ]
    render(<DrillBreadcrumb tree={tree} drillNodeId="child" onNavigate={onNavigate} />)

    fireEvent.click(screen.getByText('全部'))
    expect(onNavigate).toHaveBeenCalledWith(null)
  })

  it('calls onNavigate(nodeId) when clicking an ancestor segment', async () => {
    const onNavigate = vi.fn()
    const tree = [
      makeNode({
        id: 'r',
        label: 'Root',
        children: [
          makeNode({
            id: 'a',
            label: 'Alpha',
            children: [makeNode({ id: 'b', label: 'Beta' })],
          }),
        ],
      }),
    ]
    render(<DrillBreadcrumb tree={tree} drillNodeId="b" onNavigate={onNavigate} />)

    // Click "Root" — an ancestor button.
    fireEvent.click(screen.getByText('Root'))
    expect(onNavigate).toHaveBeenCalledWith('r')
  })

  it('last segment (current node) is not clickable', async () => {
    const onNavigate = vi.fn()
    const tree = [
      makeNode({
        id: 'root',
        label: 'Root',
        children: [makeNode({ id: 'child', label: 'Child' })],
      }),
    ]
    render(<DrillBreadcrumb tree={tree} drillNodeId="child" onNavigate={onNavigate} />)

    // "Child" is the last segment — rendered as <span>, not <button>.
    const childEl = screen.getByText('Child')
    expect(childEl.tagName).toBe('SPAN')

    // Clicking it should not trigger navigation.
    fireEvent.click(childEl)
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('shows node id as fallback when label is empty', () => {
    const tree = [
      makeNode({
        id: 'root-id',
        label: '',
        children: [makeNode({ id: 'child-id', label: '' })],
      }),
    ]
    render(
      <DrillBreadcrumb tree={tree} drillNodeId="child-id" onNavigate={vi.fn()} />,
    )

    // Falls back to id.
    expect(screen.getByText('root-id')).toBeInTheDocument()
    expect(screen.getByText('child-id')).toBeInTheDocument()
  })
})
