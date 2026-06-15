import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MindMapHeader from '../MindMapHeader'
import type { MindMap } from '@/types/mindmap'

function makeMindmap(overrides: Partial<MindMap> = {}): MindMap {
  return {
    id: 'm1',
    title: '测试图谱',
    pattern: 'auto',
    tree: [
      {
        id: 'root',
        label: 'Root',
        summary: '',
        children: [],
        editedByUser: false,
      },
    ],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as MindMap
}

const baseProps = {
  mindmaps: [] as MindMap[],
  activeMindmapId: 'm1',
  activeMindmap: makeMindmap(),
  nodeCount: 17,
  isAgentActive: false,
  isFullscreen: false,
  onSelectMindmap: () => {},
  onRenameMindmap: () => {},
  onChangePattern: () => {},
  onOpenDrawer: () => {},
  linkedCount: 0,
  onExportPng: () => {},
  onExportSvg: () => {},
  onExportMd: () => {},
  onToggleFullscreen: () => {},
}

describe('MindMapHeader — min-width invariant', () => {
  it('declares min-w-max on the header so the 3-column grid never collapses', () => {
    // User feedback: in narrow viewports, the MIDDLE column
    // (node count + pattern + status pill) used to wrap into
    // two lines ("17" / "节点") because the grid's 1fr columns
    // shrank past each pill's intrinsic width. The fix is a
    // min-w-max on the header (combined with shrink-0 /
    // whitespace-nowrap on each pill) so the host panel
    // overflows horizontally instead of squeezing the pills.
    render(<MindMapHeader {...baseProps} />)
    const header = screen.getByTestId('mindmap-header')
    expect(header.className).toMatch(/min-w-max/)
  })

  it('locks the three middle pills against wrapping / shrinking', () => {
    render(<MindMapHeader {...baseProps} />)
    // Node count pill.
    const nodeCount = screen.getByText('17 节点')
    expect(nodeCount.className).toMatch(/whitespace-nowrap/)
    expect(nodeCount.className).toMatch(/shrink-0/)
    // Status pill (the 'isAgentActive: false' branch renders "空闲").
    const status = screen.getByTestId('agent-status-pill')
    expect(status.className).toMatch(/whitespace-nowrap/)
    expect(status.className).toMatch(/shrink-0/)
    // Pattern trigger.
    const pattern = screen.getByLabelText('切换 pattern')
    expect(pattern.className).toMatch(/whitespace-nowrap/)
    expect(pattern.className).toMatch(/shrink-0/)
  })
})

describe('MindMapHeader — left section', () => {
  it('renders the linked-conversations drawer button with a count badge when linkedCount > 0', () => {
    render(<MindMapHeader {...baseProps} linkedCount={3} />)
    const trigger = screen.getByLabelText('打开关联会话（3）')
    expect(trigger).toBeInTheDocument()
    expect(trigger.className).toMatch(/shrink-0/)
    expect(trigger.className).toMatch(/whitespace-nowrap/)
  })

  it('hides the badge when linkedCount is 0', () => {
    render(<MindMapHeader {...baseProps} linkedCount={0} />)
    expect(screen.queryByLabelText('0 个关联会话')).toBeNull()
  })
})

describe('MindMapHeader — right section', () => {
  it('renders export / fullscreen controls', () => {
    render(<MindMapHeader {...baseProps} />)
    expect(screen.getByLabelText('导出')).toBeInTheDocument()
    expect(screen.getByLabelText('全屏')).toBeInTheDocument()
  })

  it('does NOT render a "关闭面板" button (collapse lives at app-level)', () => {
    // The header used to carry an in-panel X button that
    // duplicated ChatPage's app-level Network toggle
    // (title="关闭脑图"). User feedback flagged the two
    // close affordances; collapse is now exclusively driven
    // from the app-level toolbar.
    render(<MindMapHeader {...baseProps} />)
    expect(screen.queryByLabelText('关闭面板')).toBeNull()
  })
})
