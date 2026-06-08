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

describe('FlowNode (mindmap-shell-v2)', () => {
  it('renders the label', () => {
    const { getByText } = renderWithProvider(<FlowNode {...makeProps({ label: 'hello' })} />)
    expect(getByText('hello')).toBeTruthy()
  })

  it('renders the summary in the body', () => {
    const { getByText } = renderWithProvider(
      <FlowNode {...makeProps({ label: 'x', summary: 'short body' })} />,
    )
    expect(getByText('short body')).toBeTruthy()
  })

  it('does not render the ⤢ expand affordance (removed in v2 cleanup)', () => {
    // The earlier "double-click to expand / ⌘+double-click to edit"
    // affordance was a no-op visually. The v2 cleanup drops it;
    // double-clicking the node now opens the editor directly.
    const { container } = renderWithProvider(<FlowNode {...makeProps({ label: 'plain' })} />)
    expect(container.querySelector('.flow-node-affordance')).toBeNull()
    expect(container.querySelector('.flow-node-expand-hint')).toBeNull()
  })
})
