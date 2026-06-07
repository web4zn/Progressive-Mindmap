import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import FlowNode from '../FlowNode'
import type { FlowNodeData } from '../index'
import type { NodeProps } from '@xyflow/react'

// reactflow uses ResizeObserver and other DOM bits happy-dom does not
// implement, so we stub them out for these focused FlowNode unit tests.
vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
})

function makeProps(dataOverrides: Partial<FlowNodeData> = {}): NodeProps & {
  data: FlowNodeData
} {
  return {
    id: 'n1',
    data: {
      label: 'Test node',
      summary: '',
      content: '',
      contentType: undefined,
      depth: 0,
      pattern: 'auto',
      editedByUser: false,
      hasChildren: false,
      collapsed: false,
      expanded: false,
      ...dataOverrides,
    },
  } as unknown as NodeProps & { data: FlowNodeData }
}

// FlowNode uses @xyflow/react's <Handle> which reads from the
// ReactFlow store, so the component must be rendered inside a
// ReactFlowProvider to avoid "you have not used zustand provider" errors.
function renderWithProvider(ui: React.ReactNode) {
  return render(<ReactFlowProvider>{ui}</ReactFlowProvider>)
}

describe('FlowNode (Phase 1 Bug 2 — ⤢ affordance)', () => {
  it('renders the ⤢ affordance on every node regardless of content type', () => {
    const { container, rerender } = renderWithProvider(
      <FlowNode {...makeProps({ label: 'plain' })} />,
    )
    expect(container.querySelector('.flow-node-affordance')).toBeTruthy()

    rerender(
      <ReactFlowProvider>
        <FlowNode
          {...makeProps({
            label: 'rich',
            content: '<p>some <strong>html</strong></p>',
            contentType: 'html',
          })}
        />
      </ReactFlowProvider>,
    )
    expect(container.querySelector('.flow-node-affordance')).toBeTruthy()

    rerender(
      <ReactFlowProvider>
        <FlowNode
          {...makeProps({
            label: 'edited',
            editedByUser: true,
          })}
        />
      </ReactFlowProvider>,
    )
    expect(container.querySelector('.flow-node-affordance')).toBeTruthy()
  })

  it('affordance carries a tooltip with the interaction hint', () => {
    const { container } = renderWithProvider(<FlowNode {...makeProps({ label: 'tip' })} />)
    const affordance = container.querySelector('.flow-node-affordance')
    expect(affordance).toBeTruthy()
    // Native title attribute (browser-rendered tooltip)
    expect(affordance?.getAttribute('title')).toContain('双击展开')
    expect(affordance?.getAttribute('title')).toContain('Ctrl/⌘+双击编辑')
    // Custom CSS tooltip text
    const bubble = container.querySelector('.flow-node-affordance-tooltip')
    expect(bubble?.textContent).toContain('双击展开')
    expect(bubble?.textContent).toContain('Ctrl/⌘+双击编辑')
  })

  it('affordance is rendered as a span (not a button) so clicks pass through to React Flow', () => {
    const { container } = renderWithProvider(
      <FlowNode {...makeProps({ label: 'passthru' })} />,
    )
    const affordance = container.querySelector('.flow-node-affordance')
    expect(affordance?.tagName.toLowerCase()).toBe('span')
    // No click handler — clicks should fall through to the parent node.
    expect((affordance as HTMLElement | null)?.onclick).toBeNull()
  })

  it('does not place the ⤢ inside the context menu (no overlap with right-click)', () => {
    // The affordance lives in `.flow-node-meta` (header right side),
    // not in the body. Spot-check: it is a sibling of the label.
    const { container } = renderWithProvider(<FlowNode {...makeProps({ label: 'pos' })} />)
    const meta = container.querySelector('.flow-node-meta')
    const affordance = meta?.querySelector('.flow-node-affordance')
    expect(affordance).toBeTruthy()
  })
})
