import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MindMapOutline from '../MindMapOutline'

// Mock the store so the outline has data to render. The mock must
// accept the zustand-style selector (or be a no-arg call) since the
// component calls `useMindmapStore(s => s.mindmaps)` and friends.
const mindmap = {
  id: 'mm-1',
  title: 'Sample mindmap',
  tree: [
    {
      id: 'r',
      label: 'Root',
      summary: '',
      children: [
        {
          id: 'a',
          label: 'Alpha',
          summary: '',
          children: [
            { id: 'a1', label: 'Alpha-1', summary: '', children: [], editedByUser: false },
          ],
          editedByUser: false,
        },
        { id: 'b', label: 'Beta', summary: '', children: [], editedByUser: false },
      ],
      editedByUser: false,
    },
  ],
  monitoredConversationIds: [],
  pattern: 'auto',
  createdAt: 0,
  updatedAt: 0,
}

const emptyMindmap = { ...mindmap, id: 'mm-2', tree: [], title: 'Empty' }

let activeMindmapId = 'mm-1'
let mindmaps = [mindmap]

vi.mock('@/stores/mindmapStore', () => ({
  useMindmapStore: (selectorOrNothing?: (s: unknown) => unknown) => {
    const state = { mindmaps, activeMindmapId }
    if (typeof selectorOrNothing === 'function') {
      return selectorOrNothing(state)
    }
    return state
  },
}))

describe('MindMapOutline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeMindmapId = 'mm-1'
    mindmaps = [mindmap]
  })

  it('renders the closed state (aria-hidden=true) when open=false', () => {
    render(<MindMapOutline open={false} onClose={() => {}} onFocus={() => {}} />)
    const aside = screen.getByTestId('mindmap-outline')
    expect(aside.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders the title bar + list when open', () => {
    render(<MindMapOutline open={true} onClose={() => {}} onFocus={() => {}} />)
    const aside = screen.getByTestId('mindmap-outline')
    expect(aside.getAttribute('aria-hidden')).toBe('false')
    expect(screen.getByText('大纲')).toBeInTheDocument()
    // 4 nodes: root, alpha, alpha-1, beta
    expect(screen.getByTestId('mindmap-outline-row-r')).toBeInTheDocument()
    expect(screen.getByTestId('mindmap-outline-row-a')).toBeInTheDocument()
    expect(screen.getByTestId('mindmap-outline-row-a1')).toBeInTheDocument()
    expect(screen.getByTestId('mindmap-outline-row-b')).toBeInTheDocument()
  })

  it('clicking a row calls onFocus + onClose', () => {
    const onFocus = vi.fn()
    const onClose = vi.fn()
    render(<MindMapOutline open={true} onClose={onClose} onFocus={onFocus} />)
    // The row's interactive part is the inner button (title=label).
    fireEvent.click(screen.getByTitle('Alpha'))
    expect(onFocus).toHaveBeenCalledWith('a')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking the close button calls onClose', () => {
    const onClose = vi.fn()
    render(<MindMapOutline open={true} onClose={onClose} onFocus={() => {}} />)
    fireEvent.click(screen.getByLabelText('关闭大纲'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('collapses a subtree when its chevron is clicked', () => {
    render(<MindMapOutline open={true} onClose={() => {}} onFocus={() => {}} />)
    expect(screen.getByTestId('mindmap-outline-row-a1')).toBeInTheDocument()
    // Two rows have children (root and Alpha). Pick Alpha's chevron.
    const collapseBtns = screen.getAllByLabelText('折叠子节点')
    const alphaChevron = collapseBtns.find(
      (b) => b.closest('[data-testid="mindmap-outline-row-a"]') !== null,
    )
    expect(alphaChevron).toBeDefined()
    fireEvent.click(alphaChevron!)
    expect(screen.queryByTestId('mindmap-outline-row-a1')).toBeNull()
  })

  it('renders the empty state when the active mindmap has no nodes', () => {
    mindmaps = [emptyMindmap]
    activeMindmapId = 'mm-2'
    render(<MindMapOutline open={true} onClose={() => {}} onFocus={() => {}} />)
    expect(screen.getByText('暂无节点')).toBeInTheDocument()
  })

  it('Esc closes the outline when open', () => {
    const onClose = vi.fn()
    render(<MindMapOutline open={true} onClose={onClose} onFocus={() => {}} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Esc does NOT close the outline when closed', () => {
    const onClose = vi.fn()
    render(<MindMapOutline open={false} onClose={onClose} onFocus={() => {}} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not render a full-viewport backdrop (v1 fixed inset-0 is gone)', () => {
    // The v1 revision rendered a `<div fixed inset-0 z-40 bg-black/10>`
    // backdrop that dimmed the entire window. The v2 revision is
    // scoped to the panel (no full-viewport overlay).
    const { container } = render(
      <MindMapOutline open={true} onClose={() => {}} onFocus={() => {}} />,
    )
    expect(container.querySelector('.fixed.inset-0')).toBeNull()
  })

  it('docks at the top-right of the canvas container (absolute, in-canvas)', () => {
    const { getByTestId } = render(
      <MindMapOutline open={true} onClose={() => {}} onFocus={() => {}} />,
    )
    const aside = getByTestId('mindmap-outline')
    // Absolute positioning (relative to MindMapTree's `flex-1
    // relative` canvas area) — not full-viewport (`fixed`).
    expect(aside.className).toMatch(/\babsolute\b/)
    expect(aside.className).toMatch(/\btop-3\b/)
    expect(aside.className).toMatch(/\bright-3\b/)
    expect(aside.className).not.toMatch(/\bfixed\b/)
    // Not the v3 side-column layout (which used left-0/right-0
    // with h-full) — the in-canvas overlay is a top-right corner
    // badge with its own width / capped height.
    expect(aside.className).not.toMatch(/\bleft-0\b/)
    expect(aside.className).not.toMatch(/\bh-full\b/)
  })
})
