import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import MindMapTree from '../MindMapTree'

vi.mock('@/components/flow-shell', () => ({
  FlowShell: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="flow-shell">{children}</div>
  ),
}))

vi.mock('../MindMapEditModal', () => ({ default: () => null }))
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

describe('MindMapTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as unknown as Record<string, unknown>).__mindmapToggle
  })

  it('renders empty state', () => {
    render(<MindMapTree tree={[]} />)
    expect(screen.getByText('还没有图谱')).toBeDefined()
  })

  it('renders loading state', () => {
    render(<MindMapTree tree={[]} isGenerating={true} />)
    expect(screen.getByText('正在生成思维导图…')).toBeDefined()
  })

  it('renders error state with retry', () => {
    render(<MindMapTree tree={[]} error="生成失败" onRetry={() => {}} />)
    expect(screen.getByText('生成失败')).toBeDefined()
    expect(screen.getByText('重试')).toBeDefined()
  })

  it('renders FlowShell when tree has nodes', () => {
    render(<MindMapTree tree={[makeNode({ id: 'root', label: 'Root' })]} />)
    expect(screen.getByTestId('flow-shell')).toBeDefined()
  })

  it('shows streaming indicator', () => {
    render(<MindMapTree tree={[makeNode({ id: 'root' })]} isStreaming={true} />)
    expect(screen.getByText('生成中…')).toBeDefined()
  })
})
