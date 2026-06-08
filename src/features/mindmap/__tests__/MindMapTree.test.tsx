import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { useMindmapHistory } from '@/hooks/useMindmapHistory'
import MindMapTree from '../MindMapTree'

// The FlowShell mock exposes the onNodeDoubleClick prop as a
// clickable testid so we can drive double-click → editor flow
// without standing up the real React Flow renderer.
vi.mock('@/components/flow-shell', () => ({
  FlowShell: ({
    children,
    onNodeDoubleClick,
  }: {
    children?: React.ReactNode
    onNodeDoubleClick?: (event: unknown, node: unknown) => void
  }) => {
    // Capture the prop so the test can invoke it directly.
    if (onNodeDoubleClick) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).__lastNodeDoubleClick = onNodeDoubleClick
    }
    return (
      <div data-testid="flow-shell">
        <button
          data-testid="flow-shell-double-click-trigger"
          onDoubleClick={() => onNodeDoubleClick?.(undefined, { id: 'root' })}
        >
          trigger
        </button>
        {children}
      </div>
    )
  },
}))

vi.mock('../NodeEditorCard', () => ({ default: () => null }))
vi.mock('../MindMapContextMenu', () => ({ default: () => null }))
vi.mock('../useMindmapLayout', () => ({
  useMindmapLayout: () => ({
    collapsedIds: new Set<string>(),
    toggleCollapse: vi.fn(),
    resetCollapse: vi.fn(),
  }),
}))
vi.mock('@/lib/mindmap-layout', () => ({
  findNodeInTree: () => null,
  findParentInTree: () => null,
  isDescendantOf: () => false,
}))

// mindmap-shell-v3 (task 7): MindMapOutline reads from the store
// (mindmaps / activeMindmapId). Provide a minimal mock so it
// renders even when there's no active mindmap.
const mindmaps: Array<{
  id: string
  title: string
  tree: MindMapNode[]
  pattern: string
  monitoredConversationIds: string[]
}> = []
const activeMindmapId: string | null = null
vi.mock('@/stores/mindmapStore', () => ({
  useMindmapStore: (selectorOrNothing?: (s: unknown) => unknown) => {
    const state = { mindmaps, activeMindmapId }
    if (typeof selectorOrNothing === 'function') {
      return selectorOrNothing(state)
    }
    return state
  },
  // Stub the actions MindMapTree calls so the test doesn't
  // accidentally hit IndexedDB-backed code paths.
  default: () => ({}),
}))

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

/**
 * Wrapper that owns a single useMindmapHistory() and forwards the
 * result to MindMapTree. Mirrors the production code path where
 * MindMapPanel owns the history and MindMapTree receives it as a prop.
 */
function TreeHost(props: Omit<React.ComponentProps<typeof MindMapTree>, 'history'>) {
  const history = useMindmapHistory()
  return <MindMapTree {...props} history={history} />
}

describe('MindMapTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as unknown as Record<string, unknown>).__mindmapToggle
  })

  it('renders empty state', () => {
    render(<TreeHost tree={[]} />)
    expect(screen.getByText('还没有图谱')).toBeDefined()
  })

  it('renders loading state', () => {
    render(<TreeHost tree={[]} isGenerating={true} />)
    expect(screen.getByText('正在生成思维导图…')).toBeDefined()
  })

  it('renders error state with retry', () => {
    render(<TreeHost tree={[]} error="生成失败" onRetry={() => {}} />)
    expect(screen.getByText('生成失败')).toBeDefined()
    expect(screen.getByText('重试')).toBeDefined()
  })

  it('renders FlowShell when tree has nodes', () => {
    render(<TreeHost tree={[makeNode({ id: 'root', label: 'Root' })]} />)
    expect(screen.getByTestId('flow-shell')).toBeDefined()
  })

  it('shows streaming indicator', () => {
    render(<TreeHost tree={[makeNode({ id: 'root' })]} isStreaming={true} />)
    expect(screen.getByText('生成中…')).toBeDefined()
  })

  // mindmap-shell-v3 (task 7): the outline toggle is reachable
  // *even when the canvas isn't mounted* (error / loading / empty
  // states). Each early-return branch must wrap its content in a
  // `position: relative` container so MindCardOutline can anchor
  // to the canvas area's top-right.
  it('still renders the outline anchor in the empty state (no FlowShell)', () => {
    render(<TreeHost tree={[]} outlineOpen={true} />)
    // The FlowShell mock should NOT be present in the empty state.
    expect(screen.queryByTestId('flow-shell')).toBeNull()
    // But the outline element is.
    expect(screen.getByTestId('mindmap-outline')).toBeDefined()
  })

  it('still renders the outline anchor in the loading state', () => {
    render(<TreeHost tree={[]} isGenerating={true} outlineOpen={true} />)
    expect(screen.queryByTestId('flow-shell')).toBeNull()
    expect(screen.getByTestId('mindmap-outline')).toBeDefined()
  })

  it('still renders the outline anchor in the error state', () => {
    render(<TreeHost tree={[]} error="boom" outlineOpen={true} />)
    expect(screen.queryByTestId('flow-shell')).toBeNull()
    expect(screen.getByTestId('mindmap-outline')).toBeDefined()
  })

  it('still renders the outline anchor in the live state (with FlowShell)', () => {
    render(
      <TreeHost
        tree={[makeNode({ id: 'root', label: 'Root' })]}
        outlineOpen={true}
      />,
    )
    expect(screen.getByTestId('flow-shell')).toBeDefined()
    expect(screen.getByTestId('mindmap-outline')).toBeDefined()
  })

  // node-editor-card: double-clicking a node routes through
  // `onEditorOpen(nodeId)`. The FlowShell mock exposes a button
  // whose `onDoubleClick` mirrors React Flow's
  // `onNodeDoubleClick` callback.
  it('routes node double-click into onEditorOpen(nodeId)', () => {
    const onEditorOpen = vi.fn()
    render(
      <TreeHost
        tree={[makeNode({ id: 'root', label: 'Root' })]}
        onEditorOpen={onEditorOpen}
      />,
    )
    fireEvent.doubleClick(screen.getByTestId('flow-shell-double-click-trigger'))
    expect(onEditorOpen).toHaveBeenCalledWith('root')
  })
})
